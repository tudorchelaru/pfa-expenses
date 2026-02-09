<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <h1>Bun venit, <?= session()->get('username') ?>!</h1>
        <p>Alege o opțiune din meniu:</p>
        <ul class="list-group">
            <li class="list-group-item"><a href="/add-payment">Adaugă Plata</a></li>
            <li class="list-group-item"><a href="/reports">Rapoarte</a></li>
        </ul>
        <a href="/logout" class="btn btn-danger mt-3">Delogare</a>
    </div>
</body>
</html>
