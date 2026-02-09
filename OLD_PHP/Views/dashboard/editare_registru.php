<?= $this->extend('layout') ?>
<?= $this->section('title') ?>Editare Registru<?= $this->endSection() ?>
<?= $this->section('content') ?>

<div class="container mt-4">
    <h2>📝 Editare Registru</h2>

    <?php if (session('success')): ?>
    <div class="alert alert-success"><?= session('success') ?></div>
    <?php elseif (session('error')): ?>
    <div class="alert alert-danger"><?= session('error') ?></div>
    <?php endif; ?>

    <?php if (empty($rows)): ?>
    <p class="text-muted mt-3">Nu există înregistrări în registru.</p>
    <?php else: ?>
    <table class="table table-bordered table-sm mt-3">
        <thead class="table-light">
            <tr>
                <th>Data</th>
                <th>Tip</th>
                <th>Metodă</th>
                <th>Suma</th>
                <th>Tip Plată</th>
                <th>Deductibilitate</th>
                <th>Document</th>
                <th>Acțiuni</th>

            </tr>
        </thead>
        <tbody>
            <?php

        foreach ($rows as $i => $row):
            $tip = $row['tip'] ?? '';
            $clsTip = $tip === 'plata' ? 'table-warning' : 'table-success';
            ?>
            <tr class="<?= $clsTip ?>">
                <td><?= $row['data'] ?></td>
                <td><?= $row['tip'] ?></td>
                <td><?= $row['metoda'] ?></td>
                <td><?= number_format($row['suma'], 2) ?></td>
                <td><?= $row['tip_cheltuiala'] ?? '-' ?></td>
                <td><?= $row['deductibilitate'] ?? '100' ?>%</td>
                <?php
            $tipc = $row['tip_cheltuiala'] ?? '';

            if ($tipc == "cincizeci_la_suta") {
                $cls = 'text-danger fw-bold' ;
            } elseif ($tipc == "rata_leasing") {
                $cls = 'text-success fw-bold';
            } else {
                $cls = "";
            }
            ?>
                <td class="<?= $cls ?>"><?= esc($row['document']) ?></td>
                <td>
                    <a href="<?= base_url('/editare-inregistrare/' . $row['index']) ?>"
                        class="btn btn-sm btn-warning">Editează</a>
                    <a href="<?= base_url('/sterge-inregistrare/' . $row['index']) ?>" class="btn btn-sm btn-danger"
                        onclick="return confirm('Ești sigur că vrei să ștergi această înregistrare?')">Șterge</a>
                </td>
            </tr>
            <?php endforeach ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>

<?= $this->endSection() ?>