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

// --- 定義指令 ---
const IOCTL_SET_MOCK_DISTANCE = _IOR(SENSOR_MAGIC, 2, 4); // 保留這個定義，雖然我們這回合沒用到，但它是合約的一部分

// 準備一個 12 bytes 的空箱子 (保留)
const buffer = Buffer.alloc(DATA_SIZE); 

// --- 模擬次要感測器 (User Space 的業務邏輯) ---
function readAirQuality() {
    return Math.floor(Math.random() * 40) + 10; // PM2.5 (10~50)
}

function readNoiseLevel() {
    return Math.floor(Math.random() * 50) + 40; // 噪音 (40~90dB)
}

function readRFID() {
    if (Math.random() > 0.9) { // 10% 機率有人刷卡
        return `CARD_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    return "NO_CARD";
}

// --- 4. 業務迴圈 (Business Loop) 系統狀態聚合 (System Aggregation) ---

setInterval(() => {
    try {
        // 1. 讀取高優先級 Kernel 數據 (電子圍籬)
        const ret = ioctl(fd, IOCTL_GET_DATA, buffer);
        let fenceData = null;

        if (ret === 0) {
            fenceData = {
                distance_mm: buffer.readInt32LE(4),
                status: buffer.readInt32LE(8) === 1 ? "EMERGENCY_STOP" : "NORMAL"
            };
        }

        // 2. 讀取低優先級 User Space 數據 (空品、噪音、門禁)
        const airQuality = readAirQuality();
        const noiseLevel = readNoiseLevel();
        const accessCard = readRFID();

        // 3. 聚合成最終的戰情板 JSON (IoT Payload)
        const systemPayload = {
            timestamp: new Date().toISOString(),
            safety_subsystem: fenceData,
            environment_subsystem: {
                pm25: airQuality,
                noise_db: noiseLevel
            },
            access_subsystem: {
                last_scan: accessCard
            }
        };

        // 4. 業務邏輯輸出 (取代了原本單純的 console.log)
        console.log(`\n[AGGREGATOR] Publishing System State:`);
        console.dir(systemPayload, { depth: null, colors: true });

        // 依據打包好的數據，做出業務反應
        if (fenceData && fenceData.status === "EMERGENCY_STOP") {
            console.error(`🚨 [ALARM] SYSTEM TRIGGERED SIREN! MOTOR OFFLINE!`);
        } else if (accessCard !== "NO_CARD") {
            console.log(`🔑 [ACCESS] Processing login for ${accessCard}...`);
        }

    } catch (e) {
        console.error(`[Error] Aggregation failed:`, e.message);
    }
}, 1000); // 1秒更新一次戰情板數據

// 優雅退出 (保留)
process.on('SIGINT', () => {
    console.log('\n[System] Closing device...');
    fs.closeSync(fd);
    process.exit(0);
});