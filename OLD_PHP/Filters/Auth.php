<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class Auth implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Verifică dacă utilizatorul este autentificat
        if (!session()->get('isLoggedIn')) {
            return redirect()->to('/login')->with('error', 'Trebuie să te autentifici pentru a accesa această pagină!');
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Nu face nimic după
    }
}
