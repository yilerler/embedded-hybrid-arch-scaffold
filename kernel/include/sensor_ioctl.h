#ifndef SENSOR_IOCTL_H
#define SENSOR_IOCTL_H

#include <linux/ioctl.h>

struct sensor_data {
    unsigned int timestamp;
    int distance_mm;
    int status_code; // 0=OK, 1=Emergency Stop
};

// 新增：定義狀態常數
#define STATUS_NORMAL 0
#define STATUS_EMERGENCY_STOP 1

#define SENSOR_MAGIC 'S'
#define IOCTL_GET_DATA _IOR(SENSOR_MAGIC, 1, struct sensor_data)

// 新增：模擬故障注入 (Fault Injection) 的指令
// 讓我們可以從 Node.js 故意設定距離，測試 Kernel 會不會反應
#define IOCTL_SET_MOCK_DISTANCE _IOW(SENSOR_MAGIC, 2, int)

#endif