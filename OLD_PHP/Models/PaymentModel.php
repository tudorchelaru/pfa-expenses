<?php

namespace App\Models;

use CodeIgniter\Model;

class PaymentModel extends Model
{
    protected $table = 'payments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['amount', 'description', 'image', 'payment_date'];
    protected $useTimestamps = false; // Gestionăm manual datele
}
