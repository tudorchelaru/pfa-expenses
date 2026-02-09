<?php

namespace Config;

// Create a new instance of our RouteCollection class.
$routes = Services::routes();

// Load the system's routing file first, so that the app and ENVIRONMENT
// can override as needed.
if (file_exists(SYSTEMPATH . 'Config/Routes.php')) {
    require SYSTEMPATH . 'Config/Routes.php';
}

/*
 * --------------------------------------------------------------------
 * Router Setup
 * --------------------------------------------------------------------
 */
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('AuthController');
$routes->setDefaultMethod('login');
$routes->setTranslateURIDashes(false);
$routes->set404Override();
$routes->setAutoRoute(false); // Dezactivat pentru mai mult control

$routes->get('/', 'AuthController::login');
$routes->get('/login', 'AuthController::login'); // Ruta pentru pagina de login
$routes->post('/authenticate', 'AuthController::authenticate');
$routes->get('/logout', 'AuthController::logout');
$routes->get('/add-payment', 'DashboardController::addPayment');
$routes->get('/reports', 'DashboardController::reports');
$routes->post('/save-payment', 'DashboardController::savePayment');
$routes->get('/get-image/(:num)', 'DashboardController::getImage/$1');



// Grupare de rute pentru cele protejate prin filtrul `auth`
$routes->group('', ['filter' => 'auth'], function ($routes) {
    $routes->get('/dashboard', 'DashboardController::index');
    $routes->get('/add-payment', 'DashboardController::addPayment');
    $routes->get('/reports', 'DashboardController::reports');
    $routes->get('/registru', 'DashboardController::registru');
    $routes->post('/save-registru', 'DashboardController::saveRegistru');
    $routes->get('/genereaza-registre', 'DashboardController::registruGenerator');
    $routes->get('/registre', 'DashboardController::listeazaRegistre');
    $routes->get('/vizualizare-registru/(:any)', 'DashboardController::vizualizarePDF/$1');

    $routes->get('/user-nou', 'DashboardController::userNou');
    $routes->post('/salveaza-user', 'DashboardController::salveazaUser');

    $routes->get('/editare-registru', 'DashboardController::editareRegistru');
    $routes->get('/editare-inregistrare/(:num)', 'DashboardController::editareInregistrare/$1');
    $routes->post('/salveaza-inregistrare/(:num)', 'DashboardController::salveazaInregistrare/$1');
    $routes->get('/sterge-inregistrare/(:num)', 'DashboardController::stergeInregistrare/$1');
});




/*
 * --------------------------------------------------------------------
 * Route Definitions
 * --------------------------------------------------------------------
 */

// We get a performance increase by specifying the default
// route since we don't have to scan directories.
$routes->get('/', 'Home::index');

/*
 * --------------------------------------------------------------------
 * Additional Routing
 * --------------------------------------------------------------------
 *
 * There will often be times that you need additional routing and you
 * need it to be able to override any defaults in this file. Environment
 * based routes is one such time. require() additional route files here
 * to make that happen.
 *
 * You will have access to the $routes object within that file without
 * needing to reload it.
 */
if (file_exists(APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php')) {
    require APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php';
}