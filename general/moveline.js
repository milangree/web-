/* 鼠标特效 - 线条拖尾 */
(function lineDustCursor() {

    var possibleColors = ["#D61C59", "#E7D84B", "#1B8798"]; // 定义可能的线条颜色
    var width = window.innerWidth;
    var height = window.innerHeight;
    var cursor = { x: width / 2, y: width / 2 };
    var particles = [];

    function init() {
        bindEvents();
        loop();
        // 创建一个用于放置线条的容器
        var cursorContainer = document.createElement('div');
        cursorContainer.className = 'js-cursor-container';
        document.body.appendChild(cursorContainer);
    }

    // 绑定需要的事件
    function bindEvents() {
        document.addEventListener('mousemove', onMouseMove);
        window.addEventListener('resize', onWindowResize);
    }

    function onWindowResize(e) {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    function onMouseMove(e) {
        cursor.x = e.clientX;
        cursor.y = e.clientY;

        addParticle(cursor.x, cursor.y, possibleColors[Math.floor(Math.random() * possibleColors.length)]);
    }

    function addParticle(x, y, color) {
        var particle = new Particle();
        particle.init(x, y, color);
        particles.push(particle);
    }

    function updateParticles() {

        // 更新粒子
        for (var i = 0; i < particles.length; i++) {
            particles[i].update();
        }

        // 移除死亡的粒子
        for (var i = particles.length - 1; i >= 0; i--) {
            if (particles[i].lifeSpan < 0) {
                particles[i].die();
                particles.splice(i, 1);
            }
        }

    }

    function loop() {
        requestAnimationFrame(loop);
        updateParticles();
    }

    /**
     * 粒子
     */

    function Particle() {

        this.lifeSpan = 120; // ms，线条的生命周期
        this.initialStyles = {
            "position": "fixed",
            "display": "block", // 改为块级元素以便控制宽度和高度
            "top": "0px",
            "left": "0px",
            "pointerEvents": "none",
            "touch-action": "none",
            "z-index": "10000000",
            "height": "2px", // 定义线条的高度
            "width": "20px", // 定义线条的初始宽度
            "will-change": "transform",
            "border-radius": "1px" // 让线条边缘更柔和
        };

        // 初始化并设置属性
        this.init = function (x, y, color) {

            this.velocity = {
                x: (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 2 + 0.5), // 调整X方向的速度范围
                y: Math.random() * 2 + 1 // 调整Y方向的速度，让线条向下飘落
            };

            this.position = { x: x, y: y }; // 修改线条的初始位置
            this.initialStyles.backgroundColor = color; // 线条的颜色

            this.element = document.createElement('div'); // 创建一个 div 作为线条
            applyProperties(this.element, this.initialStyles);
            this.update();

            document.querySelector('.js-cursor-container').appendChild(this.element);
        };

        this.update = function () {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            this.lifeSpan--;

            // 根据生命周期调整线条的透明度和大小
            var opacity = this.lifeSpan / 120;
            var scale = this.lifeSpan / 120;
            this.element.style.transform = "translate3d(" + this.position.x + "px," + this.position.y + "px, 0) scaleX(" + scale + ")"; // 仅在X轴缩放
            this.element.style.opacity = opacity;
        }

        this.die = function () {
            this.element.parentNode.removeChild(this.element);
        }

    }

    /**
     * 工具函数
     */

    // 将 CSS `properties` 应用到元素上
    function applyProperties(target, properties) {
        for (var key in properties) {
            target.style[key] = properties[key];
        }
    }

    if (!('ontouchstart' in window || navigator.msMaxTouchPoints)) init();
})();
