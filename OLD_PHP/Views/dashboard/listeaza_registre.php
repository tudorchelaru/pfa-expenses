<?= $this->extend('layout') ?>

<?= $this->section('title') ?>Registre Generate<?= $this->endSection() ?>

<?= $this->section('content') ?>
<div class="container mt-4">
	<h2 class="mb-4">Registre PDF Generate</h2>
<?php if (session()->getFlashdata('success')): ?>
		<div class="alert alert-success">
			<?= session()->getFlashdata('success') ?>
		</div>
	<?php endif; ?>
	
	<?php
	//$parola ="EvaNatalia2020";
	//$hash = password_hash($parola, PASSWORD_DEFAULT);
	?>
	<?php if (empty($pdfuri)): ?>
		<div class="alert alert-warning">Nu există fișiere PDF generate.</div>
	<?php else: ?>
		<ul class="list-group">
			<?php foreach ($pdfuri as $pdf): ?>
				<li class="list-group-item d-flex justify-content-between align-items-center">
					<?= esc($pdf) ?>
					<a href="<?= base_url('/vizualizare-registru/' . urlencode($pdf)) ?>" class="btn btn-sm btn-primary" target="_blank">Deschide</a>
				</li>
			<?php endforeach; ?>
		</ul>
	<?php endif; ?>
</div>
<?= $this->endSection() ?>