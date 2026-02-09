<!DOCTYPE html>
<html lang="ro">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $this->renderSection("title") ?></title>

    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Datepicker (opțional) -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css"
        rel="stylesheet">

    <!-- Custom CSS -->
    <link href="/css/style.css" rel="stylesheet">
</head>

<body>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">My App</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav align-items-center">

                    <li class="nav-item">
                        <a class="nav-link <?= uri_string() === 'registru' ? 'active' : '' ?>" href="/registru">Adaugă
                            Registru</a>
                    </li>

                    <div class="vr mx-2"></div>

                    <li class="nav-item">
                        <a class="nav-link <?= uri_string() === 'genereaza-registru' ? 'active' : '' ?>"
                            href="/genereaza-registre">Generează Registre</a>
                    </li>

                    <div class="vr mx-2"></div>

                    <li class="nav-item">
                        <a class="nav-link <?= uri_string() === 'registre' ? 'active' : '' ?>" href="/registre">Vezi
                            Registre</a>
                    </li>
                    <div class="vr mx-2"></div>
                    <li class="nav-item">
                        <a class="nav-link <?= uri_string() === 'editare-registru' ? 'active' : '' ?>"
                            href="/editare-registru">📝 Editare registru</a>
                    </li>
                    <?php if (session('username') === 'tudor'): ?>
                    <div class="vr mx-2"></div>
                    <li class="nav-item">
                        <a class="nav-link <?= uri_string() === 'user-nou' ? 'active' : '' ?>" href="/user-nou">👤 User
                            nou</a>
                    </li>
                    <?php endif; ?>

                    <div class="vr mx-2"></div>

                    <li class="nav-item">
                        <a class="nav-link text-danger" href="/logout">Deconectare</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Conținut principal -->
    <div class="container mt-4">
        <?= $this->renderSection("content") ?>
    </div>

    <!-- Bootstrap JS + dependențe -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Datepicker (opțional) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js">
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</body>

</html>