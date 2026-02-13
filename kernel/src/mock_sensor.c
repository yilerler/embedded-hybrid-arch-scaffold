#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>
#include <linux/timer.h>
#include <linux/mutex.h>
#include <linux/device.h>  // 新增：為了 class 和 device
#include <linux/err.h>     // 新增：為了處理錯誤指標
#include "../include/sensor_ioctl.h"

#define DEVICE_NAME "mock_sensor"
#define CLASS_NAME  "mock_class" // 新增：裝置類別名稱

struct mock_sensor_dev {
    struct cdev cdev;
    struct mutex lock;
    struct timer_list timer;
    struct sensor_data data;
    int is_active;
    struct class *dev_class;
    struct device *dev_device;
    int direction; // 新增：0 = 遠離中, 1 = 靠近中
};

static dev_t dev_num;
static struct mock_sensor_dev *my_dev;

// --- Timer Function ---
static void mock_hardware_timer_func(struct timer_list *t) {
    struct mock_sensor_dev *dev = from_timer(dev, t, timer);
    int noise;

    mutex_lock(&dev->lock);
    
    // 產生一點雜訊
    noise = (int)(jiffies % 5);

    // --- 1. 物理現象模擬邏輯 ---
    if (dev->direction == 0) { 
        // 遠離中
        dev->data.distance_mm += (15 + noise);
        if (dev->data.distance_mm >= 400) {
            dev->data.distance_mm = 400;
            dev->direction = 1; // 折返
        }
    } else {
        // 靠近中
        dev->data.distance_mm -= (15 + noise);
        if (dev->data.distance_mm <= 5) {
            dev->data.distance_mm = 5;
            dev->direction = 0; // 折返
        }
    }

    // --- 2. 保命急停邏輯 ---
    if (dev->data.distance_mm < 10) {
        dev->data.status_code = STATUS_EMERGENCY_STOP; // 狀態碼設為 1
        
        // 模擬硬體瞬間斷電！
        printk(KERN_EMERG "Mock Sensor: [SAFETY CRITICAL] Distance < 10mm! MOTOR STOPPED!\n");
    } else {
        dev->data.status_code = STATUS_NORMAL; // 狀態碼設為 0
    }

    dev->data.timestamp = jiffies;
    mutex_unlock(&dev->lock);

    if (dev->is_active) {
        mod_timer(&dev->timer, jiffies + msecs_to_jiffies(100));
    }
}

// --- IOCTL Function ---
static long mock_sensor_ioctl(struct file *file, unsigned int cmd, unsigned long arg) {
    struct mock_sensor_dev *dev = file->private_data;
    int ret = 0;
    int new_dist;

    mutex_lock(&dev->lock);
    switch (cmd) {
        case IOCTL_GET_DATA:
            if (copy_to_user((struct sensor_data *)arg, &dev->data, sizeof(struct sensor_data))) {
                ret = -EFAULT;
            }
            break;
            
        // 新增：手動設定距離 (這是為了測試！)
        case IOCTL_SET_MOCK_DISTANCE:
            if (copy_from_user(&new_dist, (int *)arg, sizeof(int))) {
                ret = -EFAULT;
            } else {
                dev->data.distance_mm = new_dist;
                printk(KERN_INFO "Mock Sensor: Manual distance set to %dmm\n", new_dist);
            }
            break;

        default:
            ret = -EINVAL;
    }
    mutex_unlock(&dev->lock);
    return ret;
}

static int mock_sensor_open(struct inode *inode, struct file *file) {
    struct mock_sensor_dev *dev = container_of(inode->i_cdev, struct mock_sensor_dev, cdev);
    file->private_data = dev;
    return 0;
}

static const struct file_operations fops = {
    .owner = THIS_MODULE,
    .open = mock_sensor_open,
    .unlocked_ioctl = mock_sensor_ioctl,
};

// --- Init ---
static int __init mock_sensor_init(void) {
    int ret;
    
    // 1. 申請裝置編號
    if ((ret = alloc_chrdev_region(&dev_num, 0, 1, DEVICE_NAME)) < 0) {
        return ret;
    }

    my_dev = kzalloc(sizeof(struct mock_sensor_dev), GFP_KERNEL);
    if (!my_dev) {
        unregister_chrdev_region(dev_num, 1);
        return -ENOMEM;
    }

    mutex_init(&my_dev->lock);
    timer_setup(&my_dev->timer, mock_hardware_timer_func, 0);

    cdev_init(&my_dev->cdev, &fops);
    if ((ret = cdev_add(&my_dev->cdev, dev_num, 1)) < 0) {
        kfree(my_dev);
        unregister_chrdev_region(dev_num, 1);
        return ret;
    }

    // 2. 新增：自動建立 /dev/mock_sensor 節點
    // 這會通知 udev 在 /dev 下建立檔案
    my_dev->dev_class = class_create(THIS_MODULE, CLASS_NAME);
    if (IS_ERR(my_dev->dev_class)) {
        cdev_del(&my_dev->cdev);
        kfree(my_dev);
        unregister_chrdev_region(dev_num, 1);
        return PTR_ERR(my_dev->dev_class);
    }

    my_dev->dev_device = device_create(my_dev->dev_class, NULL, dev_num, NULL, DEVICE_NAME);
    if (IS_ERR(my_dev->dev_device)) {
        class_destroy(my_dev->dev_class);
        cdev_del(&my_dev->cdev);
        kfree(my_dev);
        unregister_chrdev_region(dev_num, 1);
        return PTR_ERR(my_dev->dev_device);
    }

    // 3. 啟動 Timer
    my_dev->is_active = 1;
    my_dev->direction = 0; // 預設往外跑
    my_dev->data.distance_mm = 100;
    mod_timer(&my_dev->timer, jiffies + msecs_to_jiffies(100));

    printk(KERN_INFO "Mock Sensor: Initialized successfully with /dev/%s.\n", DEVICE_NAME);
    return 0;
}

// --- Exit ---
static void __exit mock_sensor_exit(void) {
    del_timer_sync(&my_dev->timer); // 使用 sync 確保 timer 真的停了
    
    // 新增：移除裝置節點和類別
    device_destroy(my_dev->dev_class, dev_num);
    class_destroy(my_dev->dev_class);

    cdev_del(&my_dev->cdev);
    kfree(my_dev);
    unregister_chrdev_region(dev_num, 1);
    printk(KERN_INFO "Mock Sensor: Goodbye.\n");
}

module_init(mock_sensor_init);
module_exit(mock_sensor_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Joshua");
MODULE_DESCRIPTION("A Mock Sensor Driver for Hybrid Architecture Scaffold");