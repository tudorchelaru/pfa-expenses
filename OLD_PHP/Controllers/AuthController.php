<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\Controller;

class AuthController extends Controller
{
    public function login()
    {
        // Dacă utilizatorul este deja autentificat, redirecționează-l către dashboard
        if (session()->get('isLoggedIn')) {
            return redirect()->to('/dashboard');
        }
        
        return view('auth/login');
    }
    
    public function authenticate()
    {
        $session = session();
        $model = new UserModel();
        
        // Obținem datele din formular
        $username = $this->request->getPost('username');
        $password = $this->request->getPost('password');
        
        // Căutăm utilizatorul în baza de date
        $user = $model->where('username', $username)->first();
        
        if ($user) {
            // Verificăm parola
            if (password_verify($password, $user['password'])) {
                // Setăm datele de sesiune
                $sessionData = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'isLoggedIn' => true,
                ];
                $session->set($sessionData);
                
                return redirect()->to('/dashboard');
            } else {
                // Parolă greșită
                return redirect()->back()->with('error', 'Parolă incorectă!')->withInput();
            }
        } else {
            // Utilizator inexistent
            return redirect()->back()->with('error', 'Utilizator inexistent!')->withInput();
        }
    }
    
    public function logout()
    {
        $session = session();
        $session->destroy(); // Distruge sesiunea utilizatorului
        
        return redirect()->to('/login')->with('success', 'Te-ai delogat cu succes!');
    }
}
