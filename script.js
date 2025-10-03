// 全域變數
let allData = []; // 儲存所有資料
let uniqueLocations = new Set(); // 儲存所有唯一的轉蛋機地點
let currentSortColumn = 'name';
let isAscending = true;

// --- CSV 載入與初始化 ---

// 載入 CSV 檔案
function loadCSV() {
    // 檔案是 Tab-delimited (TSV)，因此使用 fetch 讀取，並用 '\t' 分隔
    fetch('gachadata.csv')
        .then(response => response.text())
        .then(csvText => {
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
                if (values.length === headers.length) {
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
            sortAndDisplayData();
        })
        .catch(error => {
            console.error('載入 CSV 檔案時發生錯誤:', error);
            document.getElementById('resultCount').innerText = "資料載入失敗，請檢查檔案路徑。";
        });
}

// --- 地點篩選功能 ---

function setupCheckboxes() {
    const container = document.getElementById('locationCheckboxes');
    container.innerHTML = ''; // 清空舊內容
    
    // 將 Set 轉換為 Array 並排序，以便顯示
    const sortedLocations = Array.from(uniqueLocations).sort();

    sortedLocations.forEach(location => {
        const id = `loc-${location.replace(/[^a-zA-Z0-9]/g, '-')}`; // 創建安全的 ID
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.name = 'location';
        checkbox.value = location;
        checkbox.checked = true; // 預設全部勾選

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

// --- 搜尋與篩選主邏輯 ---

function applyFilters() {
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
    tableBody.innerHTML = ''; // 清空舊結果
    
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
document.getElementById('searchInput').addEventListener('keyup', applyFilters);

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
        applyFilters(); 
    });
});


// 網頁載入完成後執行
window.onload = loadCSV;