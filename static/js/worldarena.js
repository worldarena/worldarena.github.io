// ===============================================
// 1. DATA CONFIGURATION (Strictly matching tree)
// ===============================================

const BASE_PATH = './assets/worldarena/videos';

// 数据结构：Dimension -> Folder Name -> Subtasks -> (Special Flags)
const DATA = {
    "Visual Quality": {
        folder: "Visual_Quality",
        subtasks: [
            { name: "Image Quality", path: "image_quality" },
            { name: "Aesthetic Quality", path: "aesthetic_quality" },
            { name: "JEPA Similarity", path: "JEPA_similarity", hasGT: true }
        ]
    },
    "Motion Quality": {
        folder: "Motion_Quality",
        subtasks: [
            { name: "Dynamic Degree", path: "dynamic_degree" },
            { name: "Flow Score", path: "flow_score" },
            { name: "Motion Smoothness", path: "motion_smoothness" }
        ]
    },
    "Content Consistency": {
        folder: "Content_Consistency",
        subtasks: [
            { name: "Subject Consist.", path: "subject_consistency" },
            { name: "Background Consist.", path: "background_consistency" },
            { name: "Photometric Consist.", path: "photometric_consistency" }
        ]
    },
    "Physics Adhere.": {
        folder: "physics_adherence",
        subtasks: [
            { name: "Interaction Quality", path: "Interaction_qulity" }, // Keep typo as per tree
            { name: "Trajectory Acc.", path: "trajectory_consistency", hasGT: true }
        ]
    },
    "3D Acc.": {
        folder: "3D_Accuracy",
        subtasks: [
            { name: "Depth Acc.", path: "Depth_Accuracy", hasGT: true },
            { name: "Perspectivity", path: "Perspectivity" }
        ]
    },
    "Controllability": {
        folder: "Controllability",
        subtasks: [
            { name: "Instruction Following", path: "Instruction_Following", hasGT: true },
            { name: "Semantic Alignment", path: "Semnatic_Alignment", hasGT: true }, // Keep typo as per tree
            { name: "Action Following", path: "Action_Following", hasVideo2: true }
        ]
    }
};

// State
let curDim = "Visual Quality";
let curSub = DATA["Visual Quality"].subtasks[0];
let curScene = 0; // 0, 1, 2

// ===============================================
// 2. INITIALIZATION & RENDERING
// ===============================================

function init() {
    // DOM Elements
    const dimTabs = document.getElementById('dim-tabs-container');
    const subTabs = document.getElementById('sub-tabs-container');
    const sceneGroup = document.getElementById('scene-group-container');
    
    if (!dimTabs || !subTabs || !sceneGroup) {
        console.warn("Visualization elements not found, skipping init");
        return;
    }
    
    renderDimTabs();
    updateUI();
    setupSlider('slider-container-1', 'handle-1', 'layer-left-1', 'layer-right-1');
    setupSlider('slider-container-2', 'handle-2', 'layer-left-2', 'layer-right-2');
    setupSidebarObserver();
}

function renderDimTabs() {
    const dimTabs = document.getElementById('dim-tabs-container');
    if (!dimTabs) return;
    
    dimTabs.innerHTML = '';
    Object.keys(DATA).forEach(key => {
        const btn = document.createElement('button');
        btn.className = `dim-btn ${key === curDim ? 'active' : ''}`;
        btn.textContent = key;
        btn.onclick = () => {
            curDim = key;
            curSub = DATA[key].subtasks[0];
            curScene = 0;
            renderDimTabs(); // Re-render to update active class
            updateUI();
        };
        dimTabs.appendChild(btn);
    });
}

function renderSubTabs() {
    const subTabs = document.getElementById('sub-tabs-container');
    if (!subTabs) return;
    
    subTabs.innerHTML = '';
    DATA[curDim].subtasks.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = `sub-btn ${sub.name === curSub.name ? 'active' : ''}`;
        btn.textContent = sub.name;
        btn.onclick = () => {
            curSub = sub;
            curScene = 0;
            renderSubTabs();
            updateUI(true); // true = keep scene 0
        };
        subTabs.appendChild(btn);
    });
}

function renderScenes() {
    const sceneGroup = document.getElementById('scene-group-container');
    if (!sceneGroup) return;
    
    sceneGroup.innerHTML = '';
    // Assuming 3 scenes (0, 1, 2)
    [0, 1, 2].forEach(i => {
        const img = document.createElement('img');
        img.className = `scene-thumb ${i === curScene ? 'active' : ''}`;
        
        // Construct thumbnail path: videos/[Folder]/[Sub]/[i]/good/00000.jpg (or png)
        const ext = (curSub.path.includes('image_quality') || curSub.path.includes('map_seg')) ? 'png' : 'jpg';
        const thumbPath = `${BASE_PATH}/${DATA[curDim].folder}/${curSub.path}/${i}/good/00000.${ext}`;
        
        img.src = thumbPath;
        img.onclick = () => {
            curScene = i;
            renderScenes();
            loadVideos();
        };
        sceneGroup.appendChild(img);
    });
}

function updateUI(resetScene = false) {
    if(resetScene) curScene = 0;
    renderSubTabs();
    renderScenes();
    loadVideos();
}

// ===============================================
// 3. VIDEO LOADING LOGIC
// ===============================================

function loadVideos() {
    const folder = DATA[curDim].folder;
    const sub = curSub.path;
    const pathBase = `${BASE_PATH}/${folder}/${sub}/${curScene}`;

    const infoBox = document.getElementById('instruction-display');
    const secBox = document.getElementById('secondary-compare');
    
    // 获取 4 个标签
    const labTL = document.getElementById('label-tl');
    const labTR = document.getElementById('label-tr');
    const labBL = document.getElementById('label-bl');
    const labBR = document.getElementById('label-br');

    // 获取 4 个视频
    const vTL = document.getElementById('vid-top-left');
    const vTR = document.getElementById('vid-top-right');
    const vBL = document.getElementById('vid-bottom-left');
    const vBR = document.getElementById('vid-bottom-right');

    const updateLabelWithModelName_good = (prefix, url, element) => {
        fetch(url)
            .then(r => {
                if (r.ok) return r.text();
                return "Unknown Model"; // 如果文件不存在，显示默认值
            })
            .then(text => {
                // 去除可能存在的换行符
                const modelName = text.trim();
                element.innerHTML = `${prefix}<span style="color: #22c55e; font-weight: bold;">${modelName}</span>`;
            })
            .catch(() => {
                element.innerHTML = `${prefix}<span style="color: #ef4444;">Unknown</span>`;
            });
    };
    const updateLabelWithModelName_bad = (prefix, url, element) => {
        fetch(url)
            .then(r => {
                if (r.ok) return r.text();
                return "Unknown Model"; // 如果文件不存在，显示默认值
            })
            .then(text => {
                // 去除可能存在的换行符
                const modelName = text.trim();
                element.innerHTML = `${prefix}<span style="color: #ef4444; font-weight: bold;">${modelName}</span>`;
            })
            .catch(() => {
                element.innerHTML = `${prefix}<span style="color: #ef4444;">Unknown</span>`;
            });
    };

    if (sub.includes('Action_Following')) {
        // --- 逻辑：Action Following ---
        if (infoBox) infoBox.style.display = 'block';
        if (secBox) secBox.style.display = 'block';

        // 分配视频源
        if (vTL) vTL.src = `${pathBase}/good/video.mp4`;   // Good 1
        if (vTR) vTR.src = `${pathBase}/good/video_2.mp4`; // Good 2
        if (vBL) vBL.src = `${pathBase}/bad/video.mp4`;    // Bad 1
        if (vBR) vBR.src = `${pathBase}/bad/video_2.mp4`;  // Bad 2

        if (labTL) updateLabelWithModelName_good("Good Case 1: ", `${pathBase}/good/model1.txt`, labTL);
        if (labTR) updateLabelWithModelName_good("Good Case 2: ", `${pathBase}/good/model1.txt`, labTR);
        if (labBL) updateLabelWithModelName_bad("Bad Case 1: ",  `${pathBase}/good/model2.txt`,  labBL);
        if (labBR) updateLabelWithModelName_bad("Bad Case 2: ",  `${pathBase}/good/model2.txt`,  labBR);

        // 加载指令并处理 **加粗**
        const fetchTxt = (url, el) => {
            fetch(url).then(r => r.ok ? r.text() : "").then(t => {
                if (el) el.innerHTML = t.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            });
        };
        fetchTxt(`${pathBase}/good/1.txt`, document.getElementById('text-good-content'));
        fetchTxt(`${pathBase}/good/2.txt`, document.getElementById('text-bad-content'));

    } else {
        // --- 逻辑：其他普通任务 ---
        if (infoBox) infoBox.style.display = 'none';
        
        // 恢复默认标签
        if (labTL) labTL.innerText = "Good Case";
        if (labTR) labTR.innerText = "Bad Case";
        if (labBL) labBL.innerText = "Good Case (V2)";
        if (labBR) labBR.innerText = "Bad Case (V2)";

        if (vTL) vTL.src = `${pathBase}/good/video.mp4`;
        if (vTR) vTR.src = `${pathBase}/bad/video.mp4`;

        if (curSub.hasVideo2) {
            if (secBox) secBox.style.display = 'block';
            if (vBL) vBL.src = `${pathBase}/good/video_2.mp4`;
            if (vBR) vBR.src = `${pathBase}/bad/video_2.mp4`;
        } else {
            if (secBox) secBox.style.display = 'none';
        }
    }

    // 播放所有视频
    [vTL, vTR, vBL, vBR].forEach(v => { if(v && v.src) v.play().catch(()=>{}); });

    // GT 逻辑保持不变
    const gtContainer = document.getElementById('gt-container');
    const vidGT = document.getElementById('vid-gt');
    
    if (curSub.hasGT) {
        if (gtContainer) gtContainer.style.display = 'block';
        if (vidGT) vidGT.src = `${pathBase}/gt/video.mp4`;
    } else {
        if (gtContainer) gtContainer.style.display = 'none';
    }
}

// ===============================================
// 4. SLIDER INTERACTION (Clip Path)
// ===============================================

function setupSlider(containerId, handleId, leftLayerId, rightLayerId) {
    const container = document.getElementById(containerId);
    const handle = document.getElementById(handleId);
    const leftLayer = document.getElementById(leftLayerId);
    const rightLayer = document.getElementById(rightLayerId);

    // Safety check: if elements don't exist, stop (prevents console errors)
    if (!container || !handle || !leftLayer) return;

    let isDragging = false;

    // Function to update widths based on mouse X position
    function updateSlider(clientX) {
        const rect = container.getBoundingClientRect();
        let x = clientX - rect.left;
        
        // Calculate percentage (0 to 100)
        let percent = (x / rect.width) * 100;
        
        // Clamp between 5% and 95% so it doesn't disappear completely
        percent = Math.max(5, Math.min(95, percent));

        // Apply styles
        handle.style.left = `${percent}%`;
        leftLayer.style.width = `${percent}%`;
        
        // Adjust right layer if it exists
        if (rightLayer) {
            rightLayer.style.width = `${100 - percent}%`;
        }
    }

    // --- Mouse Events ---
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        e.preventDefault(); // Prevent text selection
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        updateSlider(e.clientX);
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // --- Touch Events (Mobile) ---
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        updateSlider(e.touches[0].clientX);
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// ===============================================
// 5. SIDEBAR OBSERVER
// ===============================================

function setupSidebarObserver() {
    const sidebarLinks = document.querySelectorAll('.fixed-sidebar nav a');
    const scrollProgress = document.querySelector('.scroll-progress');

    if (sidebarLinks.length === 0) return;

    // 1. 核心高亮逻辑：观察者模式
    const observerOptions = {
        root: null,
        rootMargin: '-15% 0px -70% 0px', // 触发区域：屏幕上方15%到下方70%
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 当章节进入视口指定区域
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                sidebarLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    // 绑定所有有 ID 的章节进行观察
    sidebarLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const section = document.querySelector(href);
            if (section) observer.observe(section);
        }
    });

    // 2. 点击平滑滚动（解决遮挡问题）
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerOffset = 100; // 如果你顶部有固定导航栏，请调整这个高度
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. 顶部滚动进度条（如果有的话）
    if (scrollProgress) {
        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            scrollProgress.style.transform = `scaleX(${scrolled / 100})`;
        });
    }
}

// ===============================================
// 6. RENDER SCENES WITH TASK LABELS (Alternative version)
// ===============================================

function renderScenesWithLabels() {
    const sceneGroup = document.getElementById('scene-group-container');
    if (!sceneGroup) return;
    
    sceneGroup.innerHTML = '';
    // 循环生成 0, 1, 2 三个场景按钮
    [0, 1, 2].forEach(i => {
        // 创建包裹容器
        const item = document.createElement('div');
        item.className = `scene-item ${i === curScene ? 'active' : ''}`;
        
        // 判断图片后缀
        const ext = (curSub.path.includes('image_quality') || curSub.path.includes('map_seg')) ? 'png' : 'jpg';
        const thumbPath = `${BASE_PATH}/${DATA[curDim].folder}/${curSub.path}/${i}/good/00000.${ext}`;
        
        // 创建图片元素
        const img = document.createElement('img');
        img.className = 'scene-thumb';
        img.src = thumbPath;
        
        // 创建文字标注 (Task 1, Task 2...)
        const label = document.createElement('span');
        label.className = 'scene-label';
        label.textContent = `Task ${i + 1}`;
        
        // 组合并绑定点击事件
        item.appendChild(img);
        item.appendChild(label);
        
        item.onclick = () => {
            curScene = i;
            renderScenesWithLabels(); // 重新渲染以更新 active 状态
            loadVideos();   // 加载对应的视频
        };
        
        sceneGroup.appendChild(item);
    });
}

// ===============================================
// 7. INITIALIZATION
// ===============================================

// 确保 DOM 加载完后启动
document.addEventListener('DOMContentLoaded', init);