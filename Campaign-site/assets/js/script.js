// --- CONFIGURATION ---
const API_URL = "https://script.google.com/macros/s/AKfycbymKKpg1hihXyX5a8dmpg8xnHPVhetuBnM2v0Ul1jXK4eeDRkga6t-p_6N2hM_5IstDBA/exec";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// --- STATE MANAGEMENT ---
// Store previous values to animate only when data changes
let previousTotalCount = 0;
let previousDonationsCount = 0;
let previousDonationsAmount = 0;
let previousExpensesCount = 0;
let previousExpensesAmount = 0;

// --- UTILITY FUNCTIONS ---

/**
 * Animates a number from a start to an end value.
 * @param {string} id - The ID of the HTML element to update.
 * @param {number} start - The starting number.
 * @param {number} end - The ending number.
 * @param {number} [duration=1500] - The animation duration in milliseconds.
 */
function animateCounter(id, start, end, duration = 1500) {
    const el = document.getElementById(id);
    if (!el) return;

    const range = end - start;
    let current = start;
    const stepTime = 20; // ms
    const increment = range / (duration / stepTime);
    
    // Add pulse animation class
    el.parentElement.classList.add('counter-update');
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
            // Remove animation class after animation completes
            setTimeout(() => {
                el.parentElement.classList.remove('counter-update');
            }, 500);
        }
        el.textContent = Math.floor(current).toLocaleString();
    }, stepTime);
}

/**
 * Displays a status message with appropriate styling
 * @param {string} message - The message to display
 * @param {string} type - The type of message ('success', 'warning', 'error')
 * @param {HTMLElement} container - The container element to display the message in
 */
function displayStatusMessage(message, type, container) {
    const statusClass = `status-${type}`;
    const icons = {
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    container.innerHTML = `
        <div class="${statusClass} p-4 rounded-lg transition-all duration-300">
            <p class="font-bold text-lg">${icons[type]} ${message}</p>
        </div>
    `;
}

// --- API FUNCTIONS ---

/**
 * Fetches data from the API and updates the statistics on the page.
 */
async function fetchAndUpdateStats() {
    try {
        console.log('Fetching data from API...');
        const res = await fetch(API_URL);
        
        if (!res.ok) {
            throw new Error(`API responded with status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Raw API Response:', data);
        console.log('Type of response:', typeof data);
        console.log('Is array:', Array.isArray(data));

        // Handle different possible data structures
        let processedData = [];
        if (Array.isArray(data)) {
            processedData = data;
        } else if (data.data && Array.isArray(data.data)) {
            processedData = data.data;
        } else if (data.values && Array.isArray(data.values)) {
            processedData = data.values;
        } else {
            console.log('Unexpected data structure:', data);
            processedData = [];
        }

        console.log('Processed data:', processedData);
        console.log('Number of rows:', processedData.length);

        if (processedData.length > 0) {
            console.log('Sample row:', processedData[0]);
            console.log('Available fields:', Object.keys(processedData[0] || {}));
        }

        // Filter for all on-chain transactions
        const allOnChainTxns = processedData.filter(row => {
            const hasValidAmount = !isNaN(parseFloat(row.amount)) && parseFloat(row.amount) > 0;
            let isOnChain = false;
            if (row.onChain !== undefined && row.onChain !== null) {
                const onChainValue = row.onChain.toString().toLowerCase();
                isOnChain = onChainValue === 'true' || onChainValue === '1' || onChainValue === 'yes';
            }
            return hasValidAmount && isOnChain;
        });

        // Filter for donations (direction IN)
        const donationTxns = allOnChainTxns.filter(row => {
            return row.direction === "IN" || row.direction === "in";
        });

        // Filter for expenses (direction OUT)
        const expenseTxns = allOnChainTxns.filter(row => {
            return row.direction === "OUT" || row.direction === "out";
        });

        console.log('All on-chain transactions:', allOnChainTxns.length);
        console.log('Donation transactions (IN):', donationTxns);
        console.log('Expense transactions (OUT):', expenseTxns);

        // Calculate totals
        const totalCount = allOnChainTxns.length;
        const donationsCount = donationTxns.length;
        const donationsAmount = donationTxns.reduce((sum, row) => sum + parseFloat(row.amount), 0);
        const expensesCount = expenseTxns.length;
        const expensesAmount = expenseTxns.reduce((sum, row) => sum + parseFloat(row.amount), 0);

        console.log(`Totals - All: ${totalCount}, Donations: ${donationsCount} (KSh ${donationsAmount}), Expenses: ${expensesCount} (KSh ${expensesAmount})`);

        // Update displays
        document.getElementById('txnCount').textContent = totalCount.toLocaleString();
        document.getElementById('donationsCount').textContent = donationsCount.toLocaleString();
        document.getElementById('donationsAmount').textContent = donationsAmount.toLocaleString();
        document.getElementById('expensesCount').textContent = expensesCount.toLocaleString();
        document.getElementById('expensesAmount').textContent = expensesAmount.toLocaleString();

        // Animate changes
        if (totalCount !== previousTotalCount) {
            animateCounter("txnCount", previousTotalCount, totalCount);
            previousTotalCount = totalCount;
        }

        if (donationsCount !== previousDonationsCount) {
            animateCounter("donationsCount", previousDonationsCount, donationsCount);
            previousDonationsCount = donationsCount;
        }

        if (donationsAmount !== previousDonationsAmount) {
            animateCounter("donationsAmount", previousDonationsAmount, donationsAmount);
            previousDonationsAmount = donationsAmount;
        }

        if (expensesCount !== previousExpensesCount) {
            animateCounter("expensesCount", previousExpensesCount, expensesCount);
            previousExpensesCount = expensesCount;
        }

        if (expensesAmount !== previousExpensesAmount) {
            animateCounter("expensesAmount", previousExpensesAmount, expensesAmount);
            previousExpensesAmount = expensesAmount;
        }

        console.log('Stats updated successfully');

    } catch (err) {
        console.error("Failed to fetch donation data:", err);
        
        // Show error state for all counters
        document.getElementById('txnCount').textContent = 'Error';
        document.getElementById('donationsAmount').textContent = 'Error';
        document.getElementById('donationsCount').textContent = 'Error';
        document.getElementById('expensesAmount').textContent = 'Error';
        document.getElementById('expensesCount').textContent = 'Error';
    }
}

/**
 * Verifies a contribution based on user input.
 * @param {Event} event - The form submission event.
 */
async function verifyContribution(event) {
    event.preventDefault(); // Prevent page from reloading
    
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const amount = document.getElementById('amount').value;
    const resultEl = document.getElementById("verifyResult");

    if (!date || !time || !amount) {
        displayStatusMessage('Please fill in all fields to verify.', 'warning', resultEl);
        return;
    }

    // Show a loading spinner while fetching
    resultEl.innerHTML = `<div class="loading-spinner h-12 w-12 mx-auto"></div>`;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Network response was not ok.');
        const data = await res.json();

        // Handle different data structures like in fetchAndUpdateStats
        let processedData = [];
        if (Array.isArray(data)) {
            processedData = data;
        } else if (data.data && Array.isArray(data.data)) {
            processedData = data.data;
        } else if (data.values && Array.isArray(data.values)) {
            processedData = data.values;
        }

        const matchedTransaction = processedData.find(row => {
            // Ensure the row from the API has the necessary data before comparing
            if (!row.date || !row.time || !row.amount) {
                return false;
            }

            const isDateMatch = row.date === date;
            const isAmountMatch = parseFloat(row.amount) === parseFloat(amount);
            
            // Time matching within a +/- 1 hour window
            const inputTime = new Date(`1970-01-01T${time}:00`);
            const transactionTime = new Date(`1970-01-01T${row.time}`);
            const timeDiffHours = Math.abs(inputTime - transactionTime) / 3600000;
            const isTimeMatch = timeDiffHours <= 1;

            return isDateMatch && isAmountMatch && isTimeMatch;
        });
        
        // Display result after a short delay for effect
        setTimeout(() => {
            if (matchedTransaction) {
                const isOnChain = matchedTransaction.onChain?.toString().toLowerCase() === 'true';
                if (isOnChain) {
                    resultEl.innerHTML = `
                        <div class="bg-green-100 text-green-800 p-4 rounded-lg transition-all duration-300">
                            <p class="font-bold text-lg">✅ Verified On-Chain!</p>
                            <p class="text-sm mt-1">A matching transaction was found and confirmed on the ledger.</p>
                        </div>
                    `;
                } else {
                    resultEl.innerHTML = `
                        <div class="bg-yellow-100 text-yellow-800 p-4 rounded-lg transition-all duration-300">
                            <p class="font-bold text-lg">⚠️ Transaction Found, Pending Verification</p>
                            <p class="text-sm mt-1">A matching transaction was found but is not yet confirmed on-chain.</p>
                        </div>
                    `;
                }
            } else {
                resultEl.innerHTML = `
                    <div class="bg-red-100 text-red-800 p-4 rounded-lg transition-all duration-300">
                        <p class="font-bold text-lg">❌ No Matching Contribution Found</p>
                        <p class="text-sm mt-1">Please double-check the details. It may take a few minutes for new transactions to appear.</p>
                    </div>
                `;
            }
        }, 500); // 0.5-second delay

    } catch (err) {
        console.error("Verification failed:", err);
        resultEl.innerHTML = `
            <div class="bg-red-100 text-red-800 p-4 rounded-lg">
                <p class="font-bold text-lg">Error</p>
                <p class="text-sm mt-1">Could not complete verification. Please try again later.</p>
            </div>
        `;
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    
    // Attach event listener to the form
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', verifyContribution);
    }

    // Initial fetch to populate data on page load
    fetchAndUpdateStats();
    
    // Set an interval to refresh the stats
    setInterval(fetchAndUpdateStats, REFRESH_INTERVAL);
    
    console.log('Initialization complete');
});