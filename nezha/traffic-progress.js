const SCRIPT_VERSION = 'v20250705';

// == 工具函数模块 ==
const utils = (() => {
  /**
   * 格式化文件大小，自动转换单位
   * @param {number} bytes - 字节数
   * @returns {{value: string, unit: string}} 格式化后的数值和单位
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return { value: '0', unit: 'B' };
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return {
      value: size.toFixed(unitIndex === 0 ? 0 : 2),
      unit: units[unitIndex]
    };
  }

  /**
   * 计算百分比，输入可为大数，支持自动缩放
   * @param {number} used - 已使用量
   * @param {number} total - 总量
   * @returns {string} 百分比字符串，保留2位小数
   */
  function calculatePercentage(used, total) {
    used = Number(used);
    total = Number(total);
    // 大数缩放，防止数值溢出
    if (used > 1e15 || total > 1e15) {
      used /= 1e10;
      total /= 1e10;
    }
    return total === 0 ? '0.00' : ((used / total) * 100).toFixed(2);
  }

  /**
   * 格式化日期字符串，返回 yyyy-MM-dd 格式
   * @param {string} dateString - 日期字符串
   * @returns {string} 格式化日期
   */
  function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * 安全设置子元素文本内容，避免空引用错误
   * @param {HTMLElement} parent - 父元素
   * @param {string} selector - 子元素选择器
   * @param {string} text - 要设置的文本
   */
  function safeSetTextContent(parent, selector, text) {
    const el = parent.querySelector(selector);
    if (el) el.textContent = text;
  }

  /**
   * 安全设置元素样式，避免空引用错误
   * @param {HTMLElement} parent - 父元素
   * @param {string} selector - 子元素选择器
   * @param {string} property - CSS属性名
   * @param {string} value - CSS属性值
   */
  function safeSetStyle(parent, selector, property, value) {
    const el = parent.querySelector(selector);
    if (el) el.style[property] = value;
  }

  /**
   * 根据百分比返回渐变HSL颜色（绿→橙→红）
   * @param {number} percentage - 0~100的百分比
   * @returns {string} hsl颜色字符串
   */
  function getHslGradientColor(percentage) {
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const lerp = (start, end, t) => start + (end - start) * t;
    const p = clamp(Number(percentage), 0, 100);
    let h, s, l;

    if (p <= 35) {
      const t = p / 35;
      h = lerp(142, 32, t);  // 绿色到橙色
      s = lerp(69, 85, t);
      l = lerp(45, 55, t);
    } else if (p <= 85) {
      const t = (p - 35) / 50;
      h = lerp(32, 0, t);    // 橙色到红色
      s = lerp(85, 75, t);
      l = lerp(55, 50, t);
    } else {
      const t = (p - 85) / 15;
      h = 0;                 // 红色加深
      s = 75;
      l = lerp(50, 45, t);
    }
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  }

  // 查找父元素直到找到匹配的选择器
  function findParent(el, selector) {
    while (el && !el.matches(selector)) {
      el = el.parentElement;
    }
    return el;
  }

  return {
    formatFileSize,
    calculatePercentage,
    formatDate,
    safeSetTextContent,
    safeSetStyle,
    getHslGradientColor,
    findParent
  };
})();

// == 流量统计渲染模块 ==
const trafficRenderer = (() => {
  // 存储服务器名称与ID的映射
  const serverNameToIdMap = new Map();
  
  /**
   * 获取服务器卡片容器
   */
  function getServerCardContainers() {
    // 尝试多种可能的容器选择器
    const selectors = [
      'div.border.rounded-xl',
      'div.border.rounded-lg',
      'section.server-card',
      'div[data-server-id]',
      'div.bg-white.dark\\:bg-gray-800.rounded-lg.shadow'
    ];
    
    for (const selector of selectors) {
      const containers = document.querySelectorAll(selector);
      if (containers.length > 0) {
        return containers;
      }
    }
    
    // 如果以上都没找到，尝试查找包含服务器名称的元素
    const nameElements = document.querySelectorAll('p.font-medium, h3.font-medium');
    const containers = new Set();
    
    nameElements.forEach(el => {
      const container = utils.findParent(el, 'div, section');
      if (container) containers.add(container);
    });
    
    return Array.from(containers);
  }

  /**
   * 获取服务器名称
   * @param {HTMLElement} container - 服务器容器
   */
  function getServerName(container) {
    // 尝试多种可能的服务器名称元素
    const nameSelectors = [
      'p.font-medium',
      'h3.font-medium',
      'div.font-medium > p',
      'p.text-sm.font-medium',
      'div > p:first-child'
    ];
    
    for (const selector of nameSelectors) {
      const nameEl = container.querySelector(selector);
      if (nameEl && nameEl.textContent.trim()) {
        return nameEl.textContent.trim();
      }
    }
    
    // 如果以上都没找到，尝试直接查找包含文本的元素
    const textElements = container.querySelectorAll('p, h3, div');
    for (const el of textElements) {
      if (el.textContent.trim() && el.textContent.trim().length < 50) {
        return el.textContent.trim();
      }
    }
    
    return null;
  }

  /**
   * 渲染流量统计条目
   * @param {Object} trafficData - 后台返回的流量数据
   * @param {Object} config - 配置项
   */
  function renderTrafficStats(trafficData, config) {
    // 1. 构建服务器数据映射
    const serverDataMap = new Map();
    
    for (const cycleId in trafficData) {
      const cycle = trafficData[cycleId];
      if (!cycle.server_name || !cycle.transfer) continue;
      
      for (const serverId in cycle.server_name) {
        const serverName = cycle.server_name[serverId];
        const transfer = cycle.transfer[serverId];
        const max = cycle.max;
        const from = cycle.from;
        const to = cycle.to;
        
        if (serverName && transfer !== undefined && max && from && to) {
          serverDataMap.set(serverName, {
            id: serverId,
            transfer,
            max,
            name: cycle.name,
            from,
            to
          });
          // 存储名称到ID的映射
          serverNameToIdMap.set(serverName, serverId);
        }
      }
    }
    
    // 2. 获取所有服务器卡片容器
    const containers = getServerCardContainers();
    if (config.enableLog) console.log(`找到 ${containers.length} 个服务器容器`);
    
    // 3. 处理每个容器
    containers.forEach(container => {
      const serverName = getServerName(container);
      if (!serverName) {
        if (config.enableLog) console.log('无法确定服务器名称', container);
        return;
      }
      
      const serverData = serverDataMap.get(serverName);
      if (!serverData) {
        if (config.enableLog) console.log(`未找到 "${serverName}" 的流量数据`);
        return;
      }
      
      // 4. 准备数据
      const usedFormatted = utils.formatFileSize(serverData.transfer);
      const totalFormatted = utils.formatFileSize(serverData.max);
      const percentage = utils.calculatePercentage(serverData.transfer, serverData.max);
      const fromFormatted = utils.formatDate(serverData.from);
      const toFormatted = utils.formatDate(serverData.to);
      const uniqueClassName = `traffic-stats-${serverData.id}`;
      const progressColor = utils.getHslGradientColor(percentage);
      
      // 5. 查找或创建流量显示元素
      let trafficElement = container.querySelector(`.${uniqueClassName}`);
      
      if (!trafficElement) {
        trafficElement = document.createElement('div');
        trafficElement.className = `traffic-stats ${uniqueClassName} w-full mt-2`;
        trafficElement.innerHTML = `
          <div class="traffic-info flex flex-col gap-1">
            <div class="flex justify-between items-center">
              <div class="time-range text-xs text-gray-500 dark:text-gray-400">
                <span class="from-date">${fromFormatted}</span> - 
                <span class="to-date">${toFormatted}</span>
              </div>
              <div class="usage text-xs font-medium">
                <span class="used-traffic">${usedFormatted.value}</span>
                <span class="used-unit">${usedFormatted.unit}</span> / 
                <span class="total-traffic">${totalFormatted.value}</span>
                <span class="total-unit">${totalFormatted.unit}</span>
              </div>
            </div>
            <div class="progress-container flex items-center gap-2">
              <div class="progress-bar-bg bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex-grow overflow-hidden">
                <div class="progress-bar h-full rounded-full transition-all duration-300" 
                     style="width: ${percentage}%; background-color: ${progressColor};"></div>
              </div>
              <div class="percentage text-xs font-medium min-w-[40px] text-right">
                <span class="percentage-value">${percentage}</span>%
              </div>
            </div>
          </div>
        `;
        
        // 添加到容器中（尝试多种可能的位置）
        const possibleInsertPoints = [
          container.querySelector('.server-actions'),
          container.querySelector('.server-status'),
          container.querySelector('.server-info'),
          container.querySelector('.server-name').nextElementSibling,
          container.querySelector('.server-name').parentElement
        ];
        
        let inserted = false;
        for (const point of possibleInsertPoints) {
          if (point && point.parentNode) {
            point.parentNode.insertBefore(trafficElement, point.nextSibling);
            inserted = true;
            break;
          }
        }
        
        // 如果以上位置都不行，添加到容器末尾
        if (!inserted) {
          container.appendChild(trafficElement);
        }
        
        if (config.enableLog) console.log(`为服务器 "${serverName}" 添加流量显示`);
      } else {
        // 更新现有元素
        utils.safeSetTextContent(trafficElement, '.from-date', fromFormatted);
        utils.safeSetTextContent(trafficElement, '.to-date', toFormatted);
        utils.safeSetTextContent(trafficElement, '.used-traffic', usedFormatted.value);
        utils.safeSetTextContent(trafficElement, '.used-unit', usedFormatted.unit);
        utils.safeSetTextContent(trafficElement, '.total-traffic', totalFormatted.value);
        utils.safeSetTextContent(trafficElement, '.total-unit', totalFormatted.unit);
        utils.safeSetTextContent(trafficElement, '.percentage-value', percentage);
        
        const progressBar = trafficElement.querySelector('.progress-bar');
        if (progressBar) {
          progressBar.style.width = `${percentage}%`;
          progressBar.style.backgroundColor = progressColor;
        }
        
        if (config.enableLog) console.log(`更新服务器 "${serverName}" 的流量显示`);
      }
    });
  }

  return {
    renderTrafficStats,
    serverNameToIdMap
  };
})();

// == 数据请求和缓存模块 ==
const trafficDataManager = (() => {
  let trafficCache = null;

  /**
   * 请求流量数据，支持缓存
   * @param {string} apiUrl - 接口地址
   * @param {Object} config - 配置项
   * @param {Function} callback - 请求成功后的回调，参数为流量数据
   */
  function fetchTrafficData(apiUrl, config, callback) {
    const now = Date.now();
    // 使用缓存数据
    if (trafficCache && (now - trafficCache.timestamp < config.interval)) {
      if (config.enableLog) console.log('[fetchTrafficData] 使用缓存数据');
      callback(trafficCache.data);
      return;
    }

    if (config.enableLog) console.log('[fetchTrafficData] 请求新数据...');
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          if (config.enableLog) console.warn('[fetchTrafficData] 请求成功但数据异常');
          return;
        }
        if (config.enableLog) console.log('[fetchTrafficData] 成功获取新数据');
        const trafficData = data.data.cycle_transfer_stats;
        trafficCache = {
          timestamp: now,
          data: trafficData
        };
        callback(trafficData);
      })
      .catch(err => {
        if (config.enableLog) console.error('[fetchTrafficData] 请求失败:', err);
      });
  }

  return {
    fetchTrafficData
  };
})();

// == 主程序入口 ==
(function main() {
  // 默认配置
  const defaultConfig = {
    showTrafficStats: true,
    interval: 60000,  // 数据刷新间隔
    apiUrl: '/api/v1/service',
    enableLog: true,  // 默认开启日志以便调试
    debugMode: false  // 额外的调试信息
  };
  
  // 合并用户自定义配置
  let config = Object.assign({}, defaultConfig, window.TrafficScriptConfig || {});
  
  // 初始化日志
  if (config.enableLog) {
    console.log(`[TrafficScript] 版本: ${SCRIPT_VERSION} 已加载`);
    console.log('[TrafficScript] 配置:', config);
  }
  
  // 创建样式元素
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .traffic-stats {
      padding: 0.5rem 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      margin: 0.5rem 0;
    }
    .dark .traffic-stats {
      border-color: #374151;
    }
    .progress-bar-bg {
      min-width: 100px;
    }
  `;
  document.head.appendChild(styleElement);
  
  /**
   * 获取并刷新流量统计
   */
  function updateTrafficStats() {
    if (config.enableLog) console.log('[updateTrafficStats] 开始更新流量统计');
    
    trafficDataManager.fetchTrafficData(config.apiUrl, config, trafficData => {
      try {
        trafficRenderer.renderTrafficStats(trafficData, config);
        
        if (config.debugMode) {
          console.log('流量数据:', trafficData);
          console.log('服务器映射:', trafficRenderer.serverNameToIdMap);
          
          // 显示所有服务器容器
          const containers = trafficRenderer.getServerCardContainers();
          console.log('找到的服务器容器:', containers);
          
          containers.forEach(container => {
            const name = trafficRenderer.getServerName(container);
            console.log(`容器: ${name || '未知'}`, container);
          });
        }
      } catch (error) {
        console.error('[TrafficScript] 渲染流量统计时出错:', error);
      }
    });
  }
  
  /**
   * 初始化执行
   */
  function init() {
    // 初始执行
    updateTrafficStats();
    
    // 设置定时刷新
    setInterval(updateTrafficStats, config.interval);
    
    // 监听DOM变化
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // 延迟执行以避免与页面脚本冲突
          setTimeout(updateTrafficStats, 500);
          break;
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      observer.disconnect();
    });
  }
  
  // 延迟初始化以确保DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
  
  // 导出API用于调试
  window.TrafficScript = {
    refresh: updateTrafficStats,
    getConfig: () => config,
    setConfig: (newConfig) => {
      config = Object.assign({}, config, newConfig);
      updateTrafficStats();
    },
    getServerMap: () => trafficRenderer.serverNameToIdMap
  };
})();
