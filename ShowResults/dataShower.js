async function fetchData() {
    // Fetch data from the text file
    const response = await fetch('data.txt');
    const text = await response.text();
    return text.trim().split('\n').map(Number);
}

async function createChart() {
    const data = await fetchData();

    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i), // Use indices as labels
            datasets: [{
                label: 'Data Points',
                data: data,
                borderColor: 'blue',
                fill: false,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Real-Time Plot' }
            },
            scales: {
                x: { title: { display: true, text: 'Index' } },
                y: { title: { display: true, text: 'Value' } }
            }
        }
    });
}

createChart();