// 全域變數
let allData = []; // 儲存所有資料
let uniqueLocations = new Set(); // 儲存所有唯一的轉蛋機地點
let currentSortColumn = 'name';
let isAscending = true;

// --- 日間/夜間模式邏輯 ---

function applyTheme(isDark) {
    const body = document.body;
    const toggleButton = document.getElementById('themeToggle');
    
    if (isDark) {
        body.classList.add('dark-mode');
        // 將偏好儲存在本地
        localStorage.setItem('theme', 'dark');
        toggleButton.textContent = '切換至日間模式';
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        toggleButton.textContent = '切換至夜間模式';
    }
}

function toggleTheme() {
    // 檢查目前是否有 dark-mode 類別
    const isDark = document.body.classList.contains('dark-mode');
    // 切換狀態
    applyTheme(!isDark);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    // 如果有儲存的偏好，或瀏覽器偏好是深色，則啟用深色模式
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }
    
    // 為按鈕添加點擊事件監聽
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}


// --- CSV 載入與初始化 ---

// 載入 CSV 檔案 (使用 TextDecoder 強制 UTF-8 解碼來解決亂碼問題)
function loadCSV() {
    // 檔案是 Tab-delimited (TSV)。
    fetch('gachadata.csv')
        .then(response => {
            // 讀取為二進制緩衝區
            return response.arrayBuffer(); 
        })
        .then(buffer => {
            // 使用 TextDecoder 強制解碼為 UTF-8
            const decoder = new TextDecoder('utf-8');
            const csvText = decoder.decode(buffer);
            
            // 以下解析邏輯保持不變
            const lines = csvText.trim().split('\n');
            if (lines.length === 0) return;

            // 使用 Tab 分隔符號
            const headers = lines[0].split('\t').map(h => h.trim());
            
            // 檢查標頭
            if (headers[0] !== 'Name' || headers[1] !== 'gachapon' || headers[2] !== 'Percent') {
                console.error("CSV 標頭不符預期: Name, gachapon, Percent");
                document.getElementById('resultCount').innerText = "資料載入失敗：CSV格式錯誤。";
                return;
            }

            // 解析資料行
            for (let i = 1; i < lines.length; i++) {
                // 使用 Tab 分隔符號
                const values = lines[i].split('\t');
                
                if (values.length >= headers.length) {
                    const row = {
                        name: values[0].trim(),
                        gachapon: values[1].trim(),
                        percent: parseFloat(values[2].trim().replace('%', '')) || 0, // 轉換為數字
                    };
                    allData.push(row);
                    
                    // 提取所有地點
                    uniqueLocations.add(row.gachapon);
                }
            }

            // 初始化介面
            setupCheckboxes();
            runAllFiltersAndSort(); // 首次載入時運行篩選
        })
        .catch(error => {
            console.error('載入 CSV 檔案時發生錯誤:', error);
            document.getElementById('resultCount').innerText = "資料載入失敗，請檢查檔案路徑。";
        });
}

// --- 地點篩選功能 ---

function setupCheckboxes() {
    const container = document.getElementById('locationCheckboxes');
    container.innerHTML = ''; 
    
    const sortedLocations = Array.from(uniqueLocations).sort();

    sortedLocations.forEach(location => {
        const id = `loc-${location.replace(/[^a-zA-Z0-9]/g, '-')}`; 
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.name = 'location';
        checkbox.value = location;
        checkbox.checked = true; // 預設全部勾選
        // 點擊時即時篩選
        checkbox.addEventListener('change', runAllFiltersAndSort);

        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = location;

        container.appendChild(checkbox);
        container.appendChild(label);
    });
}

function getSelectedLocations() {
    const checkboxes = document.querySelectorAll('#locationCheckboxes input[name="location"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// 設定全選或全部不選功能 (由 全部/清除 按鈕調用)
function setAllCheckboxes(shouldCheck) {
    const checkboxes = document.querySelectorAll('#locationCheckboxes input[name="location"]');
    
    checkboxes.forEach(cb => {
        cb.checked = shouldCheck;
    });

    // 執行篩選
    runAllFiltersAndSort();
}

// --- 搜尋與篩選主邏輯 ---

function runAllFiltersAndSort() {
    // 獲取使用者輸入和選擇
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedLocations = getSelectedLocations();

    const filteredData = allData.filter(item => {
        // 1. 地點篩選
        const locationMatch = selectedLocations.includes(item.gachapon);
        
        // 2. 物品名稱搜尋
        const nameMatch = item.name.toLowerCase().includes(searchTerm);
        
        return locationMatch && nameMatch;
    });

    sortAndDisplayData(filteredData);
}

// --- 排序與顯示 ---

function sortAndDisplayData(data = allData) {
    // 進行排序
    data.sort((a, b) => {
        let comparison = 0;

        if (currentSortColumn === 'percent') {
            // 數字排序
            comparison = a.percent - b.percent;
        } else {
            // 字串排序 (name, gachapon)
            const aVal = a[currentSortColumn].toLowerCase();
            const bVal = b[currentSortColumn].toLowerCase();
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;
        }

        return isAscending ? comparison : comparison * -1;
    });

    displayTable(data);
}

function displayTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ''; 
    
    // 更新結果計數
    document.getElementById('resultCount').innerText = `共找到 ${data.length} 筆結果。`;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">找不到符合條件的物品。</td></tr>';
        return;
    }

    // 填入表格
    data.forEach(item => {
        const row = tableBody.insertRow();
        
        // 物品名稱 (中/英)
        row.insertCell().textContent = item.name;
        
        // 轉蛋機地點
        row.insertCell().textContent = item.gachapon;
        
        // 掉落機率 (格式化回百分比)
        row.insertCell().textContent = `${item.percent.toFixed(2)}%`;
    });
    
    // 更新表頭排序圖示
    document.querySelectorAll('#gachaTable th').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.getAttribute('data-sort') === currentSortColumn) {
            th.classList.add(isAscending ? 'asc' : 'desc');
        }
    });
}

// --- 事件監聽器 ---

// 搜尋欄位輸入時即時篩選
document.getElementById('searchInput').addEventListener('keyup', runAllFiltersAndSort);

// 表格標頭點擊排序
document.querySelectorAll('#gachaTable th').forEach(header => {
    header.addEventListener('click', function() {
        const column = this.getAttribute('data-sort');
        
        if (column === currentSortColumn) {
            isAscending = !isAscending; // 切換升降序
        } else {
            currentSortColumn = column;
            isAscending = true; // 預設升序
        }

        // 重新排序並顯示
        runAllFiltersAndSort(); 
    });
});


// 網頁載入完成後執行
window.onload = function() {
    initializeTheme(); // 先初始化主題
    loadCSV();         // 再載入資料
};