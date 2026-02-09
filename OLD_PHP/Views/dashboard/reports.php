<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Rapoarte<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <!-- Titlu -->
    <div class="row">
        <div class="col-12">
            <h2 class="mt-3">Rapoarte Cheltuieli</h2>
        </div>
    </div>

    <!-- Graficul Google Charts -->
    <div class="row">
        <div class="col-12">
            <div id="chart_div" class="mb-5" style="width: 100%; height: 500px;"></div>
        </div>
    </div>

    <!-- Tabel Detalii Cheltuieli -->
    <div class="row">
        <div class="col-12">
            <h3 id="details-title">Detalii Cheltuieli</h3>
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>#</th>
                            <th>Suma</th>
                            <th>Descriere</th>
                            <th>Data Plății</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody id="details-table-body">
                        <tr>
                            <td colspan="5" class="text-center">Selectați o lună din grafic pentru detalii.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Modal pentru afișarea imaginilor -->
<div class="modal fade" id="imageModal" tabindex="-1" aria-labelledby="imageModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="imageModalLabel">Imagine Cheltuială</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
                <img id="modal-image" src="" alt="Imagine cheltuială" class="img-fluid">
            </div>
        </div>
    </div>
</div>

<!-- Scripturi JS -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script>
    // Datele plăților și pentru grafic
    let payments = <?= json_encode($payments, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_HEX_APOS) ?>;

    if (typeof payments === 'string') {
        payments = JSON.parse(payments);
    }

    google.charts.load('current', { packages: ['corechart', 'bar'] });
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {
        let chartData = <?= json_encode($chartData) ?>;

        if (typeof chartData === 'string') {
            chartData = JSON.parse(chartData);
        }

        if (!Array.isArray(chartData) || chartData.length === 0) {
            console.error('Datele pentru grafic nu sunt valide:', chartData);
            return;
        }

        const dataTable = google.visualization.arrayToDataTable(chartData);

        const options = {
            title: 'Cheltuieli Lunare',
            hAxis: { title: 'Total', minValue: 0 },
            vAxis: { title: 'Luna' },
            bars: 'horizontal',
            legend: { position: 'none' },
            annotations: {
                alwaysOutside: true,
                textStyle: {
                    fontSize: 12,
                    color: '#000',
                    auraColor: 'none',
                },
            },
            colors: ['#1b9e77'],
        };

        const chart = new google.visualization.BarChart(document.getElementById('chart_div'));
        chart.draw(dataTable, options);

        // Adăugăm evenimentul de selectare a unei luni
        google.visualization.events.addListener(chart, 'select', function () {
            const selection = chart.getSelection();
            if (selection.length > 0) {
                const month = dataTable.getValue(selection[0].row, 0);
                console.log('Luna selectată:', month);
                loadDetails(month);
            }
        });
    }

    function loadDetails(month) {
        if (!Array.isArray(payments)) {
            console.error('Payments NU este un array valid:', payments);
            return;
        }

        // Funcție pentru a formata luna și anul
        function formatMonthYear(month) {
            const [year, monthNumber] = month.split('-');
            const months = [
                'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
            ];
            const formattedMonth = months[parseInt(monthNumber, 10) - 1]; // Convertim în index
            return `${formattedMonth} ${year}`;
        }

        // Setăm titlul pentru detalii
        const formattedTitle = `Detalii Cheltuieli ${formatMonthYear(month)}`;
        $('#details-title').text(formattedTitle);

        // Filtrăm plățile pentru luna selectată
        const filteredPayments = payments.filter(payment => {
            const paymentMonth = payment.payment_date.substring(0, 7); // Extragem YYYY-MM
            return paymentMonth === month;
        });

        const $tableBody = $('#details-table-body');
        $tableBody.empty();

        if (filteredPayments.length > 0) {
            $.each(filteredPayments, function (index, payment) {
                const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${payment.amount} RON</td>
                        <td>${payment.description}</td>
                        <td>${payment.payment_date}</td>
                        <td>
                            <button class="btn btn-sm btn-primary compact-btn show-image-btn" data-id="${payment.id}">Arată Poză</button>
                        </td>
                    </tr>
                `;
                $tableBody.append(row);
            });
        } else {
            $tableBody.append('<tr><td colspan="5" class="text-center">Nu există cheltuieli pentru această lună.</td></tr>');
        }
    }

    $(document).on('click', '.show-image-btn', function () {
        const paymentId = $(this).data('id');
        const $modalImage = $('#modal-image');
        $modalImage.attr('src', `/get-image/${paymentId}`);
        $('#imageModal').modal('show');
    });
</script>
<?= $this->endSection() ?>
