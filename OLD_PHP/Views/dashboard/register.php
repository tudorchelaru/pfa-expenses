<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Înregistrare Registru<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container mt-4">
    <div class="row">
        <div class="col-md-6">

            <h2 class="mb-4">Adaugă înregistrare în registru</h2>

            <?php if (session()->getFlashdata('success')): ?>
            <div class="alert alert-success"><?= session()->getFlashdata('success') ?></div>
            <?php elseif (session()->getFlashdata('error')): ?>
            <div class="alert alert-danger"><?= session()->getFlashdata('error') ?></div>
            <?php endif; ?>

            <form method="POST" action="<?= base_url('/save-registru') ?>">
                <div class="form-group">
                    <label for="data">Data (ex: 28012019 - in format ZZLLAAA )</label>
                    <input type="text" class="form-control" name="data" id="data" onblur="formatData(this)" required
                        autofocus>
                </div>

                <div class="form-group mt-3">
                    <label>Tip</label><br>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="tip" id="tip_incasare" value="incasare"
                            checked>
                        <label class="form-check-label" for="tip_incasare">Incasare</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="tip" id="tip_plata" value="plata">
                        <label class="form-check-label" for="tip_plata">Plata</label>
                    </div>
                </div>

                <div class="form-group mt-3">
                    <label>Metodă</label><br>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="metoda" id="metoda_numerar" value="numerar"
                            checked>
                        <label class="form-check-label" for="metoda_numerar">Numerar</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="metoda" id="metoda_banca" value="banca">
                        <label class="form-check-label" for="metoda_banca">Bancă</label>
                    </div>
                </div>
                <div id="plata_fields">
                    <div class="form-group mt-3">
                        <label>Tip cheltuială [ plata ]</label>
                        <select id="tip_cheltuiala" name="tip_cheltuiala" class="form-control">
                            <option value="diverse">Diverse</option>
                            <option value="cincizeci_la_suta">50%</option>
                            <option value="rata_leasing">Rată leasing</option>
                        </select>
                    </div>
                    <div class="form-group mt-3">
                        <label>Deductibilitate (%) [ plata]</label>
                        <span class="text-danger"> <br />Se alege 50% DOAR la ce se
                            deduce la jumate --> in rest lasam 100% </span>
                        <select id="deductibilitate" name="deductibilitate" class="form-control">
                            <option value="100">100%</option>
                            <option value="50">50%</option>
                        </select>
                    </div>
                </div>


                <div class="form-group mt-3">
                    <label for="document">Document</label>
                    <input type="text" class="form-control" name="document" id="document" required
                        placeholder="ex: Factura client X ">
                </div>
                <input type="hidden" name="valuta" value="RON">

                <div class="form-group mt-3">
                    <label for="suma">Suma (ex: 507.6)</label>
                    <input type="text" class="form-control" name="suma" id="suma" required>
                </div>

                <button type="submit" class="btn btn-primary mt-4">Adaugă</button>
            </form>
        </div>
    </div>
</div>

<script>
function formatData(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length === 8) {
        input.value = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
    }
}
</script>

<script>
function formatData(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length === 8) {
        input.value = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
    }
}

function togglePlataFields() {
    const isPlata = document.getElementById('tip_plata').checked;
    const plataFields = document.getElementById('plata_fields');
    const tipCheltuiala = document.getElementById('tip_cheltuiala');
    const deductibilitate = document.getElementById('deductibilitate');

    if (isPlata) {
        plataFields.style.display = 'block';
        tipCheltuiala.disabled = false;
        deductibilitate.disabled = false;
    } else {
        plataFields.style.display = 'none';
        tipCheltuiala.disabled = true;
        deductibilitate.disabled = true;

        // setări implicite
        tipCheltuiala.value = 'diverse';
        deductibilitate.value = '100';
    }
}

window.addEventListener('DOMContentLoaded', function() {
    togglePlataFields();
    document.getElementById('tip_incasare').addEventListener('change', togglePlataFields);
    document.getElementById('tip_plata').addEventListener('change', togglePlataFields);
});
</script>


<?= $this->endSection() ?>