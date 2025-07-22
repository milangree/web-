// nezha-network.js
document.addEventListener('DOMContentLoaded', function() {
    // 选择器定义
    const selectors = {
        button: '#root > div > main > div.mx-auto.w-full.max-w-5xl.px-0.flex.flex-col.gap-4.server-info > section > div.flex.justify-center.w-full.max-w-\\[200px\\] > div > div > div.relative.cursor-pointer.rounded-3xl.px-2\\.5.py-\\[8px\\].text-\\[13px\\].font-\\[600\\].transition-all.duration-500.text-stone-400.dark\\:text-stone-500',
        section: '#root > div > main > div.mx-auto.w-full.max-w-5xl.px-0.flex.flex-col.gap-4.server-info > section',
        div3: '#root > div > main > div.mx-auto.w-full.max-w-5xl.px-0.flex.flex-col.gap-4.server-info > div:nth-child(3)',
        div4: '#root > div > main > div.mx-auto.w-full.max-w-5xl.px-0.flex.flex-col.gap-4.server-info > div:nth-child(4)'
    };

    // 状态变量
    let hasClicked = false;
    let divVisible = false;
    let swapping = false;

    // 强制显示两个div
    function forceBothVisible() {
        const div3 = document.querySelector(selectors.div3);
        const div4 = document.querySelector(selectors.div4);
        
        if (div3) div3.style.display = 'block';
        if (div4) div4.style.display = 'block';
    }

    // 隐藏部分内容
    function hideSection() {
        const section = document.querySelector(selectors.section);
        if (section) section.style.display = 'none';
    }

    // 尝试点击按钮
    function tryClickButton() {
        const btn = document.querySelector(selectors.button);
        if (btn && !hasClicked) {
            try {
                btn.click();
                hasClicked = true;
                setTimeout(forceBothVisible, 500);
            } catch (e) {
                console.error('点击按钮失败:', e);
            }
        }
    }

    // 交换两个div的位置
    function swapDiv3AndDiv4() {
        if (swapping) return;
        swapping = true;

        const div3 = document.querySelector(selectors.div3);
        const div4 = document.querySelector(selectors.div4);
        
        if (!div3 || !div4) {
            swapping = false;
            return;
        }
        
        const parent = div3.parentNode;
        if (!parent || parent !== div4.parentNode) {
            swapping = false;
            return;
        }

        // 保存原始位置
        const originalPosition = {
            div3: Array.from(parent.children).indexOf(div3),
            div4: Array.from(parent.children).indexOf(div4)
        };

        // 仅当div3在div4上方时才交换
        if (originalPosition.div3 < originalPosition.div4) {
            parent.insertBefore(div4, div3);
            parent.insertBefore(div3, div4.nextSibling);
        }

        swapping = false;
    }

    // 检查元素可见性
    function checkVisibility() {
        const div3 = document.querySelector(selectors.div3);
        const div4 = document.querySelector(selectors.div4);

        const isDiv3Visible = div3 && getComputedStyle(div3).display !== 'none';
        const isDiv4Visible = div4 && getComputedStyle(div4).display !== 'none';
        const isAnyDivVisible = isDiv3Visible || isDiv4Visible;

        if (isAnyDivVisible && !divVisible) {
            hideSection();
            tryClickButton();
            setTimeout(swapDiv3AndDiv4, 100);
        } else if (!isAnyDivVisible && divVisible) {
            hasClicked = false;
        }

        divVisible = isAnyDivVisible;

        if (div3 && div4) {
            if (!isDiv3Visible || !isDiv4Visible) {
                forceBothVisible();
            }
        }
    }

    // 初始化MutationObserver
    function initObserver() {
        const root = document.querySelector('#root');
        if (!root) {
            setTimeout(initObserver, 500); // 延迟重试
            return;
        }

        const observer = new MutationObserver(checkVisibility);
        
        observer.observe(root, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
        
        // 初始检查
        checkVisibility();
    }

    // 启动脚本
    initObserver();
});
