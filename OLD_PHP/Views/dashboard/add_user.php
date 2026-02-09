<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Adaugă utilizator<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container mt-4">
    <h2>👤 Adaugă utilizator nou</h2>

    <?php if (session()->getFlashdata('success')): ?>
    <div class="alert alert-success mt-3"><?= session('success') ?></div>
    <?php elseif (session()->getFlashdata('error')): ?>
    <div class="alert alert-danger mt-3"><?= session('error') ?></div>
    <?php endif; ?>

    <form method="post" action="<?= base_url('/salveaza-user') ?>" class="mt-4">
        <?= csrf_field() ?>

        <div class="mb-3">
            <label for="username" class="form-label">Nume utilizator</label>
            <input type="text" name="username" id="username" class="form-control" required autofocus>
        </div>

        <div class="mb-3">
            <label for="password" class="form-label">Parolă</label>
            <input type="password" name="password" id="password" class="form-control" required>
        </div>

        <button type="submit" class="btn btn-primary">Creează utilizator</button>
    </form>
</div>
<?= $this->endSection() ?>