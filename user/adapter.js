const fs = require('fs');
const ioctl = require('ioctl-napi');

// --- 1. 定義合約 (Contract Definition) ---
// 必須跟 kernel/include/sensor_ioctl.h 完全一致
const SENSOR_MAGIC = 'S'.charCodeAt(0); // 'S' 的 ASCII 碼 (83)
const COMMAND_NR = 1;

// 定義資料結構的大小 (C語言 struct sensor_data)
// unsigned int timestamp (4 bytes)
// int distance_mm (4 bytes)
// int status_code (4 bytes)
const DATA_SIZE = 12; 

// --- 2. 實作 IOCTL 號碼計算機 (System Call Magic) ---
// Linux IOCTL 號碼產生公式：
// Bits 31-30: 方向 (Read = 2)
// Bits 29-16: 資料大小
// Bits 15-8 : Magic Number (Type)
// Bits 7-0  : 序號 (Nr)
const _IOC_NRBITS = 8;
const _IOC_TYPEBITS = 8;
const _IOC_SIZEBITS = 14;
const _IOC_DIRBITS = 2;

const _IOC_NRSHIFT = 0;
const _IOC_TYPESHIFT = _IOC_NRSHIFT + _IOC_NRBITS;
const _IOC_SIZESHIFT = _IOC_TYPESHIFT + _IOC_TYPEBITS;
const _IOC_DIRSHIFT = _IOC_SIZESHIFT + _IOC_SIZEBITS;

const _IOC_READ = 2; // _IOR

function _IOR(type, nr, size) {
    return (_IOC_READ << _IOC_DIRSHIFT) |
           (size << _IOC_SIZESHIFT) |
           (type << _IOC_TYPESHIFT) |
           (nr << _IOC_NRSHIFT);
}

// 計算出跟 Kernel 一模一樣的指令碼
const IOCTL_GET_DATA = _IOR(SENSOR_MAGIC, COMMAND_NR, DATA_SIZE);

console.log(`[System] IOCTL Command Code Calculated: 0x${IOCTL_GET_DATA.toString(16)}`);

// --- 3. 連接驅動 (Driver Interface) ---
const DEVICE_PATH = '/dev/mock_sensor';
let fd = null;

try {
    // 打開通往一樓(Kernel)的門
    // 'r+' 代表讀寫模式 (雖然我們只讀，但 ioctl 通常需要這種權限)
    fd = fs.openSync(DEVICE_PATH, 'r+');
    console.log(`[System] Device ${DEVICE_PATH} opened successfully (fd=${fd})`);
} catch (err) {
    console.error(`[Error] Failed to open ${DEVICE_PATH}. Are you root? Is the driver loaded?`);
    console.error(err.message);
    process.exit(1);
}

// --- 4. 業務迴圈 (Business Loop) ---
// 這是二樓(User Space) 的大腦
// 每 500ms 去問一次一樓：「現在距離多少？」
const buffer = Buffer.alloc(DATA_SIZE); // 準備一個 12 bytes 的空箱子

setInterval(() => {
    try {
        // 發送指令！
        // 箱子(buffer) 傳進去，Kernel 把數據填滿，然後傳回來
        const ret = ioctl(fd, IOCTL_GET_DATA, buffer);

        if (ret === 0) {
            // 解析數據 (Unmarshalling)
            // C 語言是 Little Endian (低位元在先)
            const timestamp = buffer.readUInt32LE(0);
            const distance = buffer.readInt32LE(4);
            const status = buffer.readInt32LE(8);

            // 這裡就是「防腐層」的作用：把 Buffer 轉成漂亮的 JSON
            const sensorObj = {
                t: timestamp,
                dist: distance,
                st: status,
                unit: 'mm'
            };

            // 模擬業務邏輯：如果距離太近，發出警告
            if (sensorObj.dist < 50) {
                console.warn(`[WARNING] Too Close! Distance: ${sensorObj.dist}mm`);
            } else {
                console.log(`[INFO] Sensor Data:`, sensorObj);
            }
        }
    } catch (e) {
        console.error(`[Error] IOCTL failed:`, e.message);
    }
}, 500); // 500ms 採樣一次

// 優雅退出 (Graceful Shutdown)
process.on('SIGINT', () => {
    console.log('\n[System] Closing device...');
    fs.closeSync(fd);
    process.exit(0);
});