// *** 重要：请确保在加载此脚本之前，在您的 HTML 中设置 window.websiteLaunchDate 变量！ ***
// 格式应为 'YYYY-MM-DDTHH:mm:ssZ' 或 'YYYY-MM-DDTHH:mm:ss'。
// 例如：window.websiteLaunchDate = '2023-01-01T08:00:00';
// 如果未设置，将使用当前时间作为上线日期。
const launchDate = window.websiteLaunchDate ? new Date(window.websiteLaunchDate) : new Date();

// 网站运行时间显示部分的 HTML 结构
const uptimeHtmlContent = `
    <div id="dynamic-uptime-display">
        <span class="uptime-text">本站已运行:</span>
        <span class="uptime-duration" id="days">0</span><span class="uptime-unit">天</span>
        <span class="uptime-duration" id="hours">0</span><span class="uptime-unit">小时</span>
        <span class="uptime-duration" id="minutes">0</span><span class="uptime-unit">分钟</span>
        <span class="uptime-duration" id="seconds">0</span><span class="uptime-unit">秒</span>
    </div>
`;

// 网站运行时间显示部分的 CSS 样式
const uptimeCssContent = `
    /* 网站运行时间显示容器的样式 - 模仿磨砂玻璃效果 */
    #dynamic-uptime-display {
        font-family: 'Segoe UI', sans-serif; /* 字体 */
        font-size: 0.95em; /* 基础字号，可调 */
        color: #333; /* 文字颜色，可调 */
        
        /* === 磨砂效果关键样式，请根据你的网站卡片或底部元素进行微调 === */
        background-color: rgba(255, 255, 255, 0.7); /* 半透明背景色，调整最后一个值 (0.0-1.0) 控制透明度 */
        border: 1px solid rgba(255, 255, 255, 0.3); /* 半透明边框，调整颜色和透明度 */
        border-radius: 8px; /* 圆角大小，与网站卡片保持一致 */
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* 阴影效果，调整参数 */
        
        /* 模糊效果 (部分旧浏览器可能不支持) */
        -webkit-backdrop-filter: blur(8px); /* Safari 和 Chrome */
        backdrop-filter: blur(8px); /* 标准写法，调整模糊程度 */
        /* === 磨砂效果关键样式结束 === */

        /* 居中显示 */
        display: block; /* 确保是块级元素 */
        margin: 20px auto 20px auto; /* 上下外边距20px，左右自动居中 */
        width: fit-content; /* 宽度适应内容 */
        max-width: 95%; /* 防止在小屏幕上溢出 */
        text-align: center; /* 内部文字居中 */
        padding: 10px 15px; /* 内边距 */
    }

    /* "本站已运行" 文本样式 */
    #dynamic-uptime-display .uptime-text {
        margin-right: 5px;
        color: #555; /* 可调 */
    }

    /* 显示时间数字（天、小时、分钟、秒）的样式 */
    #dynamic-uptime-display .uptime-duration {
        font-size: 1.1em; /* 可调 */
        font-weight: bold;
        color: #007bff; /* 醒目颜色，可调 */
        margin: 0 3px;
    }

    /* 时间单位（天、小时、分钟、秒）的样式 */
    #dynamic-uptime-display .uptime-unit {
        font-size: 0.85em; /* 可调 */
        color: #777; /* 可调 */
        margin-right: 8px;
    }

    /* 针对手机等小屏幕设备的响应式调整 */
    @media (max-width: 768px) {
        #dynamic-uptime-display {
            font-size: 0.85em;
            padding: 8px 12px;
            margin: 15px auto; /* 手机端调整外边距 */
            border-radius: 6px; /* 手机端圆角可略小 */
        }
        #dynamic-uptime-display .uptime-duration {
            font-size: 1em;
        }
        #dynamic-uptime-display .uptime-unit {
            font-size: 0.75em;
        }
    }
`;

// 这个函数用来计算并更新显示的时间
function updateUptime() {
    const now = new Date(); 
    const diff = now - launchDate; 

    if (diff < 0) {
        document.getElementById('days').textContent = 0;
        document.getElementById('hours').textContent = 0;
        document.getElementById('minutes').textContent = 0;
        document.getElementById('seconds').textContent = 0;
        return;
    }

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = hours % 24;
    document.getElementById('minutes').textContent = minutes % 60;
    document.getElementById('seconds').textContent = seconds % 60;
}

// 动态注入 HTML 和 CSS，并启动计时器
function injectUptimeDisplay() {
    // 注入 CSS
    const styleTag = document.createElement('style');
    styleTag.textContent = uptimeCssContent;
    document.head.appendChild(styleTag);

    // 尝试找到主要内容容器 (例如包含监控卡片的区域)
    let mainContentContainer = document.querySelector('.container.dashboard') || // Uptime Kuma 仪表板容器
                               document.querySelector('.container.main') ||     // Uptime Kuma 主容器
                               document.querySelector('.container') ||          // 通用容器
                               document.querySelector('.dashboard-body') ||     // Nezha Probe 可能的仪表板体
                               document.querySelector('main');                  // HTML5 main 标签

    // 如果以上容器都找不到，则尝试找到页脚元素
    if (!mainContentContainer) {
        mainContentContainer = document.querySelector('footer'); // 标准 footer 标签
    }

    // 如果还是找不到，作为最后手段，插入到 body 的末尾
    if (!mainContentContainer) {
        mainContentContainer = document.body;
        console.warn('未找到合适的仪表板/主内容/页脚容器，网站运行时间将插入到 body 底部。');
    }

    // 创建一个临时的 div 来解析 HTML 字符串
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = uptimeHtmlContent;
    const uptimeElement = tempDiv.firstElementChild; // 获取实际的 uptime div

    // 将运行时间显示插入到目标容器的末尾
    mainContentContainer.appendChild(uptimeElement);
    console.log('网站运行时间已插入并尝试应用磨砂效果。');

    // 启动运行时间计时器
    updateUptime();
    setInterval(updateUptime, 1000);
}

// 确保在 DOM 完全加载后再执行注入操作
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUptimeDisplay);
} else {
    injectUptimeDisplay();
}
