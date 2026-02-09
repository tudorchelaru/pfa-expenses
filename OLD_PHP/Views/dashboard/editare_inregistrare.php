<?= $this->extend('layout') ?>
<?= $this->section('title') ?>Modifică Înregistrare<?= $this->endSection() ?>
<?= $this->section('content') ?>

<div class="container mt-4">
    <h2>✏️ Editare înregistrare</h2>

    <form method="post" action="<?= base_url('/salveaza-inregistrare/' . $id) ?>" class="mt-4">
        <?= csrf_field() ?>

        <!-- DATA -->
        <div class="mb-3">
            <label for="data" class="form-label">Data (YYYY-MM-DD)</label>
            <input type="date" name="data" id="data" value="<?= esc($entry['data']) ?>" class="form-control" required>
        </div>

        <!-- TIP: plata / incasare -->
        <div class="mb-3">
            <label for="tip" class="form-label">Tip tranzacție</label>
            <select name="tip" id="tip" class="form-select" required>
                <option value="incasare" <?= $entry['tip'] === 'incasare' ? 'selected' : '' ?>>Încasare</option>
                <option value="plata" <?= $entry['tip'] === 'plata' ? 'selected' : '' ?>>Plată</option>
            </select>
        </div>

        <div id="plata_fields">
            <div class="mb-3">
                <label>Deductibilitate (%)</label>
                <select id="deductibilitate" name="deductibilitate" class="form-control">
                    <option value="100" <?= $entry['deductibilitate'] == 100 ? 'selected' : '' ?>>100%</option>
                    <option value="50" <?= $entry['deductibilitate'] == 50 ? 'selected' : '' ?>>50%</option>
                </select>
            </div>

            <div class="mb-3">
                <label>Tip cheltuială</label>
                <select id="tip_cheltuiala" name="tip_cheltuiala" class="form-control">
                    <option value="diverse" <?= $entry['tip_cheltuiala'] === 'diverse' ? 'selected' : '' ?>>Diverse
                    </option>
                    <option value="cincizeci_la_suta"
                        <?= $entry['tip_cheltuiala'] === 'cincizeci_la_suta' ? 'selected' : '' ?>>
                        50%</option>
                    <option value="rata_leasing" <?= $entry['tip_cheltuiala'] === 'rata_leasing' ? 'selected' : '' ?>>
                        Rată leasing</option>
                </select>
            </div>
        </div>
        <!-- METODA: banca / numerar -->
        <div class="mb-3">
            <label for="metoda" class="form-label">Metodă de plată</label>
            <select name="metoda" id="metoda" class="form-select" required>
                <option value="banca" <?= $entry['metoda'] === 'banca' ? 'selected' : '' ?>>Banca</option>
                <option value="numerar" <?= $entry['metoda'] === 'numerar' ? 'selected' : '' ?>>Numerar</option>
            </select>
        </div>

        <!-- SUMA -->
        <div class="mb-3">
            <label for="suma" class="form-label">Suma</label>
            <input type="number" step="0.01" name="suma" id="suma" value="<?= esc($entry['suma']) ?>"
                class="form-control" required>
        </div>

        <!-- VALUTA -->
        <div class="mb-3">
            <label for="valuta" class="form-label">Valută</label>
            <input type="text" name="valuta" id="valuta" value="<?= esc($entry['valuta']) ?>" class="form-control"
                required>
        </div>

        <!-- DOCUMENT -->
        <div class="mb-3">
            <label for="document" class="form-label">Document</label>
            <input type="text" name="document" id="document" value="<?= esc($entry['document'] ?? '') ?>"
                class="form-control">
        </div>

        <button type="submit" class="btn btn-success">💾 Salvează</button>
        <a href="<?= base_url('/editare-registru') ?>" class="btn btn-secondary">Anulează</a>
    </form>
</div>

<script>
function togglePlataFields() {
    const isPlata = document.getElementById('tip').value === 'plata';
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
    }
}

window.addEventListener('DOMContentLoaded', function() {
    // Inițializare
    togglePlataFields();

    // Eveniment la schimbare tip (dropdown aici, nu radio ca la adăugare)
    document.getElementById('tip').addEventListener('change', togglePlataFields);
});
</script>

<?= $this->endSection() ?>