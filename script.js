const balance = document.getElementById('total-balance');
const money_plus = document.getElementById('total-income');
const money_minus = document.getElementById('total-expense');
const list = document.getElementById('transaction-list');
const form = document.getElementById('finance-form');
const text = document.getElementById('description');
const amount = document.getElementById('amount');
const category = document.getElementById('category');
const searchInput = document.getElementById('search');

// Sounds
const addSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
const deleteSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
let myChart;

// 1. Theme Logic
const toggleSwitch = document.querySelector('#checkbox');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') toggleSwitch.checked = true;
}

toggleSwitch.addEventListener('change', (e) => {
    const theme = e.target.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateChart(); 
});

// 2. Add Transaction
function addTransaction(e) {
    e.preventDefault();
    if (text.value.trim() === '' || amount.value.trim() === '') return;
    
    const isIncome = category.value === 'income';
    const transaction = {
        id: Math.floor(Math.random() * 1000000),
        text: text.value,
        amount: isIncome ? +amount.value : -amount.value,
        category: category.value,
        date: new Date().toLocaleString()
    };
    
    transactions.push(transaction);
    addSound.play();
    updateLocalStorage();
    init();
    text.value = ''; amount.value = '';
}

// 3. Render DOM
function addTransactionDOM(t) {
    const item = document.createElement('li');
    item.innerHTML = `
        <div>
            <p style="font-size: 0.9rem; font-weight: 600; margin:0;">${t.text}</p>
            <small style="font-size: 0.65rem; color: var(--text-light);">${t.date}</small>
        </div>
        <div style="font-weight:700; color: ${t.amount < 0 ? '#e76f51' : '#40916c'}">
            ${t.amount < 0 ? '-' : '+'}Rs. ${Math.abs(t.amount).toFixed(2)}
            <button class="delete-btn" onclick="removeTransaction(${t.id})"><i class="fas fa-trash"></i></button>
        </div>
    `;
    list.appendChild(item);
}

// 4. Update Values
function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
    const inc = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
    const exp = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);
    
    balance.innerText = `Rs. ${total}`;
    money_plus.innerText = `Rs. ${inc}`;
    money_minus.innerText = `Rs. ${exp}`;
    
    updateChart();
    updateBudgetUI();
    updateInsights();
}

// 5. Remove
function removeTransaction(id) {
    if(confirm("Delete this record?")) {
        transactions = transactions.filter(t => t.id !== id);
        deleteSound.play();
        updateLocalStorage();
        init();
    }
}

// 6. PDF Export
document.getElementById('export-btn').addEventListener('click', () => {
    if(transactions.length === 0) return alert("No data to export!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(45, 106, 79);
    doc.text("FinAesthetic - Expense Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`User: Sewmini Dilshani | Date: ${new Date().toLocaleDateString()}`, 14, 28);

    const rows = transactions.map(t => [t.date, t.text, t.category.toUpperCase(), t.amount.toFixed(2)]);
    doc.autoTable({
        startY: 35,
        head: [['Date', 'Description', 'Category', 'Amount (Rs)']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [45, 106, 79] }
    });
    doc.save("Finance_Report.pdf");
});

// 7. Local Storage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('monthlyBudget', monthlyBudget);
}

// 8. Budget Settings
document.getElementById('set-budget-btn').addEventListener('click', () => {
    const userBudget = prompt("Set monthly limit (Rs.):", monthlyBudget);
    if (userBudget !== null) {
        monthlyBudget = parseFloat(userBudget) || 0;
        updateLocalStorage();
        updateBudgetUI();
    }
});

// 9. Chart Logic
function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const totals = { food: 0, transport: 0, shopping: 0, other: 0 };
    
    transactions.forEach(t => { 
        if (t.amount < 0 && totals.hasOwnProperty(t.category)) {
            totals[t.category] += Math.abs(t.amount); 
        }
    });
    
    if (myChart) myChart.destroy();
    
    const textColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#a0a0a0' : '#52796f';

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Food', 'Travel', 'Shop', 'Other'],
            datasets: [{ 
                data: Object.values(totals), 
                backgroundColor: ['#2d6a4f', '#52796f', '#95d5b2', '#d8f3dc'],
                borderWidth: 2
            }]
        },
        options: { 
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                }
            }
        }
    });
}

// 10. Budget UI Update
function updateBudgetUI() {
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const progressFill = document.getElementById('progress-fill');
    const budgetStatus = document.getElementById('budget-status');
    const budgetPerc = document.getElementById('budget-percentage');

    if (monthlyBudget > 0) {
        const percentage = Math.min((totalExpenses / monthlyBudget) * 100, 100);
        progressFill.style.width = percentage + '%';
        budgetPerc.innerText = Math.round(percentage) + '%';
        
        const remaining = monthlyBudget - totalExpenses;
        budgetStatus.innerText = remaining >= 0 ? `Remaining: Rs. ${remaining.toFixed(2)}` : `Over Budget: Rs. ${Math.abs(remaining).toFixed(2)}`;
        progressFill.style.background = percentage >= 100 ? '#e76f51' : '#2d6a4f';
    } else {
        budgetStatus.innerText = "Set a limit to track spending";
        budgetPerc.innerText = "0%";
        progressFill.style.width = '0%';
    }
}

// 11. Insights
function updateInsights() {
    const totals = { food: 0, transport: 0, shopping: 0, other: 0 };
    const expenses = transactions.filter(t => t.amount < 0);
    const topCategorySpan = document.getElementById('top-category');

    if (expenses.length > 0) {
        expenses.forEach(t => { if (totals.hasOwnProperty(t.category)) totals[t.category] += Math.abs(t.amount); });
        const top = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);
        topCategorySpan.innerText = totals[top] > 0 ? top : "-";
    } else {
        topCategorySpan.innerText = "-";
    }
}

// 12. Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    list.innerHTML = '';
    const filtered = transactions.filter(t => t.text.toLowerCase().includes(term));
    if(filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-light); font-size:0.8rem; margin-top:20px;">No results found.</p>';
    } else {
        filtered.forEach(addTransactionDOM);
    }
});

function init() {
    list.innerHTML = transactions.length === 0 ? '<p style="text-align:center; color:var(--text-light); font-size:0.8rem; margin-top:20px;">No records yet 🍃</p>' : '';
    transactions.forEach(addTransactionDOM);
    updateValues();
}

init();
form.addEventListener('submit', addTransaction);