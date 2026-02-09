<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'users'; // Tabela asociată
    protected $primaryKey = 'id'; // Cheia primară
    protected $allowedFields = ['username', 'password']; // Coloanele care pot fi modificate
    protected $useTimestamps = true; // Activează `created_at` și `updated_at` automat
}
