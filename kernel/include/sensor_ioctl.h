#ifndef SENSOR_IOCTL_H
#define SENSOR_IOCTL_H

#include <linux/ioctl.h>

// 定義 Magic Number (信物)
#define SENSOR_MAGIC 'S'

// 定義資料結構 (Data Structure)
struct sensor_data {
    unsigned int timestamp;
    int distance_mm;
    int status_code;
};

// 定義控制指令 (Commands)
// _IOR 代表從 Kernel 讀取資料 (Read)
#define IOCTL_GET_DATA _IOR(SENSOR_MAGIC, 1, struct sensor_data)

#endif