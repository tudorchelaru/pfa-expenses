<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Adaugă Plată<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12 col-md-8 col-lg-6">
            <h2 class="mt-3">Adaugă Plată</h2>
            <form action="/save-payment" method="POST" enctype="multipart/form-data" class="mt-4">
                <div class="mb-3">
                    <label for="amount" class="form-label">Sumă</label>
                    <input type="number" step="0.01" class="form-control" id="amount" name="amount" required>
                </div>
                <div class="mb-3">
                    <label for="description" class="form-label">Descriere</label>
                    <input type="text" class="form-control" id="description" name="description" required />
                </div>
                <div class="mb-3">
    <label for="payment_date" class="form-label">Data Plății</label>
    <div class="input-group">
        <input type="text" class="form-control" id="payment_date" name="payment_date" placeholder="Selectează data" required>
        <span class="input-group-text" id="calendar-icon">
            <i class="fas fa-calendar-alt"></i>
        </span>
    </div>
</div>

		
                <div class="mb-3">
                    <label for="image" class="form-label">Atașează Poză</label>
                    <input type="file" class="form-control" id="image" name="image" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary">Adaugă</button>
            </form>
        </div>
    </div>
</div>
<script>
    $(document).ready(function () {
        // Inițializare Datepicker
        $('#payment_date').datepicker({
            format: 'yyyy-mm-dd', // Formatul datei
            autoclose: true,      // Închidere automată după selectarea unei date
            todayHighlight: true, // Evidențiază data curentă
            orientation: 'auto',  // Poziționează calendarul automat
            container: 'body',    // Calendarul apare ca un pop-up
        });

        // Calendarul se deschide și când facem clic pe iconiță
        $('#calendar-icon').on('click', function () {
            $('#payment_date').datepicker('show');
        });
    });
</script>

<?= $this->endSection() ?>
