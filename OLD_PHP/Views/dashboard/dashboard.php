<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Dashboard<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <h1 class="mt-3">Bine ai venit, <?= session('username') ?>!</h1>
            <p class="lead">Accesează meniul din stânga pentru a naviga între funcționalități.</p>
        </div>
    </div>
</div>
<?= $this->endSection() ?>
