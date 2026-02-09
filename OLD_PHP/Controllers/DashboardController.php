<?php

namespace App\Controllers;

use App\Models\PaymentModel;

class DashboardController extends BaseController
{
    public function index()
    {
        // Redirecționează utilizatorul către "Adaugă Plata" sau altă pagină principală
        return redirect()->to("/registru");
    }

    public function addPayment()
    {
        return view("dashboard/add_payment");
    }

    public function registru()
    {
        helper(["form"]);
        return view("dashboard/register");
    }

    public function saveRegistru()
    {
        helper(["form", "url"]);
        $request = \Config\Services::request();

        // 1. Preluăm și validăm inputul
        $data_raw = preg_replace("/[^\d]/", "", $request->getPost("data"));
        $tip = $request->getPost("tip");
        $metoda = $request->getPost("metoda");
        $suma = str_replace(",", ".", $request->getPost("suma"));
        $valuta = "RON"; // implicit
        $document = trim($request->getPost("document"));
        $deductibilitate = (int) $request->getPost('deductibilitate');
        $tip_cheltuiala = $request->getPost('tip_cheltuiala');

        // 2. Validări simple
        if (!preg_match('/^(\d{2})(\d{2})(\d{4})$/', $data_raw, $m)) {
            return redirect()
              ->back()
              ->with("error", "Formatul datei este invalid.");
        }

        if (!in_array($tip, ["incasare", "plata"])) {
            return redirect()
              ->back()
              ->with("error", "Tip invalid. Alege incasare sau plata.");
        }

        if (!in_array($metoda, ["numerar", "banca"])) {
            return redirect()
              ->back()
              ->with("error", "Metodă invalidă. Alege numerar sau bancă.");
        }

        if (!is_numeric($suma) || (float) $suma <= 0) {
            return redirect()
              ->back()
              ->with("error", "Suma trebuie să fie un număr pozitiv.");
        }

        if ($document === "") {
            return redirect()
              ->back()
              ->with("error", "Completează câmpul document.");
        }

        // 3. Formatăm data în format YYYY-MM-DD
        $data = "$m[3]-$m[2]-$m[1]";

        // 4. Construim intrarea
        $linie = [
          "data" => $data,
          "tip" => $tip,
          "metoda" => $metoda,
          "suma" => (float) $suma,
          "valuta" => $valuta,
          "document" => $document,
          "deductibilitate" => $deductibilitate,
          "tip_cheltuiala" => $tip_cheltuiala,
        ];
        $username = session("username");
        // 5. Salvăm înregistrarea în registru.json
        $fisier = WRITEPATH . strtolower($username) . "_registru.json";
        $json = file_exists($fisier) ? file_get_contents($fisier) : "[]";
        $date = json_decode($json, true);
        $date[] = $linie;

        file_put_contents($fisier, json_encode($date, JSON_PRETTY_PRINT));

        // 6. Redirect cu mesaj de succes
        return redirect()
          ->to("/registru")
          ->with("success", "Înregistrare salvată cu succes.");
    }

    public function registruGenerator()
    {
        require_once APPPATH . "Libraries/fpdf.php";
        $username = session("username");
        $jsonPath = WRITEPATH . strtolower($username) . "_registru.json";
        $destPath = WRITEPATH . "registre/";
        $cursCache = WRITEPATH . "curs/";

        if (!file_exists($destPath)) {
            mkdir($destPath, 0777, true);
        }
        if (!file_exists($cursCache)) {
            mkdir($cursCache, 0777, true);
        }

        if (!file_exists($jsonPath)) {
            return redirect()->to('/registru')->with('error', 'Fișierul de registru lipsește. Adaugă cel puțin o înregistrare.');
        }

        $jsonContent = file_get_contents($jsonPath);
        $data = json_decode($jsonContent, true);

        if ($data === null || !is_array($data)) {
            return redirect()->to('/registru')->with('error', 'Fișierul de registru este corupt sau conține date invalide.');
        }
        if (!$data) {
            return "Eroare: JSON invalid sau inexistent.";
        }

        // Numele lunilor
        $luni_romana = [
          1 => "Ianuarie",
          2 => "Februarie",
          3 => "Martie",
          4 => "Aprilie",
          5 => "Mai",
          6 => "Iunie",
          7 => "Iulie",
          8 => "August",
          9 => "Septembrie",
          10 => "Octombrie",
          11 => "Noiembrie",
          12 => "Decembrie",
        ];

        // Grupare date
        $byYearMonth = [];
        foreach ($data as $entry) {
            $date = \DateTime::createFromFormat("Y-m-d", $entry["data"]);
            if (!$date) {
                continue;
            }
            $year = $date->format("Y");
            $month = (int) $date->format("m");
            $entry["year"] = $year;
            $entry["month"] = $month;
            $entry["date_obj"] = $date;
            if (!isset($entry["document"])) {
                $entry["document"] = "Document";
            }
            $byYearMonth[$year][$month][] = $entry;
        }

        // Funcție locală pentru curs
        $get_curs_usd = function ($date) {
            $zi_curenta = clone $date;
            for ($i = 0; $i < 7; $i++) {
                $data_str = $zi_curenta->format("Y-m-d");
                $url = "https://www.cursbnr.ro/arhiva-curs-bnr-$data_str";
                $html = @file_get_contents($url);
                if (
                    $html &&
                    preg_match(
                        '/Dolarul SUA<\/td><td class="text-center">([\d,\.]+)<\/td>/',
                        $html,
                        $match
                    )
                ) {
                    return (float) str_replace(",", ".", $match[1]);
                }
                do {
                    $zi_curenta->modify("-1 day");
                } while ((int) $zi_curenta->format("N") > 5);
            }
            return false;
        };

        // Generează PDF-uri
        foreach ($byYearMonth as $year => $months) {
            $pdf = new \FPDF("L", "mm", "A4");
            $pdf->AddPage();
            $pdf->SetFont("Arial", "B", 14);
            $pdf->Cell(0, 10, "Registru incasari si plati - $year", 0, 1, "C");
            $pdf->Ln(5);

            $total_inc_numerar = 0;
            $total_inc_banca = 0;
            $total_plt_numerar = 0;
            $total_plt_banca = 0;

            for ($luna = 1; $luna <= 12; $luna++) {
                if (!isset($months[$luna])) {
                    continue;
                }
                $lunaData = $months[$luna];
                $nume_luna = $luni_romana[$luna];

                if ($pdf->GetY() + 40 > 190) {
                    $pdf->AddPage();
                }

                $pdf->SetFont("Arial", "B", 12);
                $pdf->Cell(0, 8, strtoupper($nume_luna), 0, 1);
                $pdf->SetFont("Arial", "B", 10);

                $pdf->Cell(10, 10, "Nr", 1);
                $pdf->Cell(25, 10, "Data", 1);
                $pdf->Cell(70, 10, "Document", 1);
                $pdf->Cell(60, 5, "Incasari", 1, 0, "C");
                $pdf->Cell(60, 5, "Plati", 1, 1, "C");

                $pdf->Cell(10, 5, "", 0);
                $pdf->Cell(25, 5, "", 0);
                $pdf->Cell(70, 5, "", 0);
                $pdf->Cell(30, 5, "Numerar", 1, 0, "C");
                $pdf->Cell(30, 5, "Banca", 1, 0, "C");
                $pdf->Cell(30, 5, "Numerar", 1, 0, "C");
                $pdf->Cell(30, 5, "Banca", 1, 1, "C");

                $pdf->SetFont("Arial", "", 10);
                $i = 1;
                $inc_numerar = $inc_banca = $plt_numerar = $plt_banca = 0;

                usort($lunaData, fn ($a, $b) => strcmp($a["data"], $b["data"]));

                foreach ($lunaData as $entry) {
                    $date = $entry["date_obj"]->format("d.m.Y");
                    $tip = $entry["tip"];
                    $metoda = isset($entry["metoda"]) ? $entry["metoda"] : "banca";
                    $suma = (float) $entry["suma"];
                    $valuta = strtoupper($entry["valuta"]);
                    $document = $entry["document"];

                    $suma_ron =
                      $valuta === "USD"
                        ? round($suma * $get_curs_usd($entry["date_obj"]), 2)
                        : $suma;

                    $pdf->Cell(10, 7, $i++, 1);
                    $pdf->Cell(25, 7, $date, 1);
                    $pdf->Cell(70, 7, $document, 1);

                    // 4 combinații
                    $cell = ["", "", "", ""];
                    if ($tip === "incasare" && $metoda === "numerar") {
                        $cell[0] = number_format($suma_ron, 2);
                        $inc_numerar += $suma_ron;
                    }
                    if ($tip === "incasare" && $metoda === "banca") {
                        $cell[1] = number_format($suma_ron, 2);
                        $inc_banca += $suma_ron;
                    }
                    if ($tip === "plata" && $metoda === "numerar") {
                        $cell[2] = number_format($suma_ron, 2);
                        $plt_numerar += $suma_ron;
                    }
                    if ($tip === "plata" && $metoda === "banca") {
                        $cell[3] = number_format($suma_ron, 2);
                        $plt_banca += $suma_ron;
                    }

                    foreach ($cell as $val) {
                        $pdf->Cell(30, 7, $val, 1, 0, "R");
                    }

                    $pdf->Ln();
                }

                $pdf->SetFont("Arial", "B", 10);
                $pdf->Cell(105, 7, "TOTAL " . strtoupper($nume_luna), 1);
                $pdf->Cell(30, 7, number_format($inc_numerar, 2), 1, 0, "R");
                $pdf->Cell(30, 7, number_format($inc_banca, 2), 1, 0, "R");
                $pdf->Cell(30, 7, number_format($plt_numerar, 2), 1, 0, "R");
                $pdf->Cell(30, 7, number_format($plt_banca, 2), 1, 1, "R");
                $pdf->Ln(5);

                $total_inc_numerar += $inc_numerar;
                $total_inc_banca += $inc_banca;
                $total_plt_numerar += $plt_numerar;
                $total_plt_banca += $plt_banca;
            }

            $pdf->SetFont("Arial", "B", 12);
            $pdf->Cell(0, 8, "TOTAL GENERAL ANUAL", 0, 1);
            $pdf->SetFont("Arial", "B", 10);
            $pdf->Cell(105, 7, "TOTAL:", 1);
            $pdf->Cell(30, 7, number_format($total_inc_numerar, 2), 1, 0, "R");
            $pdf->Cell(30, 7, number_format($total_inc_banca, 2), 1, 0, "R");
            $pdf->Cell(30, 7, number_format($total_plt_numerar, 2), 1, 0, "R");
            $pdf->Cell(30, 7, number_format($total_plt_banca, 2), 1, 1, "R");
            $pdf->Ln(5);

            // Totaluri simple
            $total_incasari = $total_inc_numerar + $total_inc_banca;
            $total_cheltuieli = $total_plt_numerar + $total_plt_banca;
            $diff = $total_incasari - $total_cheltuieli;

            // Rând totaluri pe categorii
            $pdf->SetFont("Arial", "B", 10);
            $pdf->Cell(105, 7, "TOTAL INCASARI / PLATI:", 1);
            $pdf->Cell(60, 7, number_format($total_incasari, 2), 1, 0, "R"); // incasari total
            $pdf->Cell(60, 7, number_format($total_cheltuieli, 2), 1, 1, "R"); // plati total

            // Rând profit/pierdere
            $pdf->Cell(105, 7, $diff >= 0 ? "PROFIT:" : "PIERDERE:", 1);
            $pdf->Cell(120, 7, number_format(abs($diff), 2), 1, 1, "R");


            // 1. Calculăm totalul cheltuielilor deductibile reale (pentru profit impozabil)
            $cheltuieli_deductibile_reale = 0;
            $cheltuieli_leasing_pe_luna = [];

            // Refacem calculul bazat pe reguli fiscale reale
            foreach ($data as $entry) {
                if ($entry['tip'] !== 'plata') {
                    continue;
                }

                $suma = (float) $entry['suma'];
                $deductibilitate = isset($entry['deductibilitate']) ? (int)$entry['deductibilitate'] : 100;
                $tip_cheltuiala = $entry['tip_cheltuiala'] ?? 'diverse';
                $data_entry = \DateTime::createFromFormat("Y-m-d", $entry["data"]);
                $luna_key = $data_entry ? $data_entry->format("Y-m") : "unknown";

                if ($tip_cheltuiala === 'rata_leasing') {
                    if (!isset($cheltuieli_leasing_pe_luna[$luna_key])) {
                        $cheltuieli_leasing_pe_luna[$luna_key] = 0;
                    }
                    $cheltuieli_leasing_pe_luna[$luna_key] += $suma;
                } else {
                    $cheltuieli_deductibile_reale += $suma * ($deductibilitate / 100);
                }
            }

            // Aplicăm plafonul de 1500 RON/lună la leasing auto
            foreach ($cheltuieli_leasing_pe_luna as $suma_lunara) {
                $cheltuieli_deductibile_reale += min(1500, $suma_lunara);
            }

            // 2. Calculăm profitul impozabil (diff2)
            $diff2 = $total_incasari - $cheltuieli_deductibile_reale;

            // 3. Impozit pe profit (10%) doar dacă profitul e pozitiv
            $impozit_pe_profit = $diff2 > 0 ? $diff2 * 0.10 : 0;

            // 4. Afișăm în PDF
            $pdf->SetFont("Arial", "B", 10);
            $pdf->Cell(105, 7, "PROFIT IMPOZABIL:", 1);
            $pdf->Cell(120, 7, number_format($diff2, 2), 1, 1, "R");

            $pdf->Cell(105, 7, "IMPOZIT (10%) aplicabil:", 1);
            $pdf->Cell(120, 7, number_format($impozit_pe_profit, 2), 1, 1, "R");

            $pdf->Cell(105, 7, "CHELT. DEDUCT.(50% + max 1500 leasing/luna):", 1);
            $pdf->Cell(120, 7, number_format($cheltuieli_deductibile_reale, 2), 1, 1, "R");

            $username = session("username");
            $pdf->Output("F", $destPath . $username . "_registru_$year.pdf");
        }

        return redirect()
          ->to("/registre")
          ->with("success", "Registre PDF generate cu succes.");
    }

    public function listeazaRegistre()
    {
        $this->registruGenerator();

        $path = WRITEPATH . "registre/";
        $pdfuri = [];
        $username = session("username");
        if (is_dir($path)) {
            $files = scandir($path);
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === "pdf") {
                    if (strstr($file, $username)) {
                        $pdfuri[] = $file;
                    }
                }
            }
        }

        return view("dashboard/listeaza_registre", ["pdfuri" => $pdfuri]);
    }

    public function vizualizarePDF($filename)
    {
        $path = WRITEPATH . "registre/" . basename($filename);

        if (!file_exists($path)) {
            throw \CodeIgniter\Exceptions\PageNotFoundException::forPageNotFound(
                "Fișierul nu există."
            );
        }

        return $this->response
          ->setHeader("Content-Type", "application/pdf")
          ->setHeader("Content-Disposition", 'inline; filename="' . $filename . '"')
          ->setBody(file_get_contents($path));
    }
    public function savePayment()
    {
        // Validare formular
        $rules = [
          "amount" => "required|numeric",
          "description" => "required",
          "payment_date" => "required|valid_date[Y-m-d]",
          "image" =>
            "uploaded[image]|is_image[image]|mime_in[image,image/jpeg,image/png,image/gif]",
        ];

        if (!$this->validate($rules)) {
            return redirect()
              ->back()
              ->withInput()
              ->with("errors", $this->validator->getErrors());
        }

        $imageFile = $this->request->getFile("image");
        $imageData = null;

        // Verificăm dacă imaginea există și dimensiunea este peste 1MB
        if ($imageFile && $imageFile->isValid() && !$imageFile->hasMoved()) {
            if ($imageFile->getSize() > 1024 * 1024) {
                // Dacă imaginea este mai mare de 1MB
                $imageData = $this->compressImage($imageFile, 700 * 1024); // Reducem dimensiunea la max 700KB
            } else {
                $imageData = file_get_contents($imageFile->getTempName()); // Citim direct imaginea
            }
        }

        // Salvăm datele în baza de date
        $paymentModel = new \App\Models\PaymentModel();
        $paymentModel->insert([
          "amount" => $this->request->getPost("amount"),
          "description" => $this->request->getPost("description"),
          "payment_date" => $this->request->getPost("payment_date"),
          "image" => $imageData,
        ]);

        return redirect()
          ->to("/add-payment")
          ->with("success", "Plata a fost adăugată cu succes!");
    }

    private function compressImage($file, $maxSize)
    {
        // Tipuri suportate
        $supportedTypes = ["image/jpeg", "image/png", "image/gif"];
        $mimeType = $file->getMimeType();

        // Verificăm dacă tipul fișierului este suportat
        if (!in_array($mimeType, $supportedTypes)) {
            throw new \RuntimeException("Tipul fișierului nu este suportat.");
        }

        // Obținem dimensiunile imaginii
        list($width, $height) = getimagesize($file->getTempName());

        // Creăm resursa imaginii în funcție de tip
        $sourceImage = null;
        if ($mimeType === "image/jpeg") {
            $sourceImage = imagecreatefromjpeg($file->getTempName());
        } elseif ($mimeType === "image/png") {
            $sourceImage = imagecreatefrompng($file->getTempName());
        } elseif ($mimeType === "image/gif") {
            $sourceImage = imagecreatefromgif($file->getTempName());
        }

        // Cale pentru imaginea temporară
        $compressedImage = tempnam(sys_get_temp_dir(), "compressed_");

        // Pornim cu calitatea la 90%
        $quality = 90;

        do {
            // Cream o copie temporară a imaginii
            $tempImage = imagecreatetruecolor($width, $height);
            imagecopyresampled(
                $tempImage,
                $sourceImage,
                0,
                0,
                0,
                0,
                $width,
                $height,
                $width,
                $height
            );

            // Salvăm imaginea comprimată
            if ($mimeType === "image/jpeg") {
                imagejpeg($tempImage, $compressedImage, $quality);
            } elseif ($mimeType === "image/png") {
                $pngQuality = 9 - floor($quality / 10); // Calitate PNG inversată (0 = maxim, 9 = minim)
                imagepng($tempImage, $compressedImage, $pngQuality);
            } elseif ($mimeType === "image/gif") {
                imagegif($tempImage, $compressedImage); // GIF nu suportă compresie calitativă
            }

            // Verificăm dimensiunea imaginii rezultate
            $currentSize = filesize($compressedImage);
            $quality -= 5; // Reducem calitatea progresiv
        } while ($currentSize > $maxSize && $quality > 10);

        // Returnăm conținutul imaginii comprimate
        $compressedData = file_get_contents($compressedImage);

        // Curățăm resursele și fișierele temporare
        unlink($compressedImage);
        imagedestroy($sourceImage);
        if (isset($tempImage)) {
            imagedestroy($tempImage);
        }

        return $compressedData;
    }

    public function reports()
    {
        $paymentModel = new \App\Models\PaymentModel();

        // Generează ultimele 12 luni
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $months[date("Y-m", strtotime("-$i months"))] = 0;
        }

        // Obține totalurile din baza de date
        $results = $paymentModel
          ->select(
              'DATE_FORMAT(payment_date, "%Y-%m") as month, SUM(amount) as total'
          )
          ->where("payment_date >=", date("Y-m-01", strtotime("-11 months")))
          ->groupBy("month")
          ->orderBy("month", "ASC")
          ->findAll();

        // Completează lunile cu datele din baza de date
        foreach ($results as $row) {
            $months[$row["month"]] = (float) $row["total"];
        }

        // Pregătește datele pentru Google Charts
        $chartData = [["Luna", "Total"]];
        foreach ($months as $month => $total) {
            $chartData[] = [$month, $total];
        }

        // Obține toate cheltuielile pentru tabel (fără câmpul `image`)
        $payments = $paymentModel->findAll();

        $filteredPayments = array_map(function ($payment) {
            return [
              "id" => $payment["id"],
              "amount" => $payment["amount"],
              "description" => $payment["description"],
              "payment_date" => $payment["payment_date"],
            ];
        }, $payments);

        return view("dashboard/reports", [
          "chartData" => json_encode($chartData), // Datele pentru grafic
          "payments" => json_encode(
              $filteredPayments,
              JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_HEX_APOS
          ), // JSON brut valid
        ]);
    }

    public function getImage($id)
    {
        $paymentModel = new \App\Models\PaymentModel();
        $payment = $paymentModel->find($id);

        if ($payment && $payment["image"]) {
            // Setăm header-ul pentru imagine
            header("Content-Type: image/jpeg");
            echo $payment["image"];
            exit();
        }

        return redirect()
          ->to("/reports")
          ->with("error", "Imaginea nu a fost găsită.");
    }

    public function userNou()
    {
        if (session('username') !== 'tudor') {
            return redirect()->to('/dashboard')->with('error', 'Acces interzis.');
        }

        return view('dashboard/user_nou');
    }

    public function salveazaUser()
    {
        if (session('username') !== 'tudor') {
            return redirect()->to('/dashboard')->with('error', 'Acces interzis.');
        }

        $username = trim($this->request->getPost('username'));
        $password = trim($this->request->getPost('password'));

        if (!$username || !$password) {
            return redirect()->back()->with('error', 'Completarea tuturor câmpurilor este obligatorie.');
        }

        $model = new \App\Models\UserModel();

        if ($model->where('username', $username)->first()) {
            return redirect()->back()->with('error', 'Utilizatorul deja există.');
        }

        $model->insert([
            'username' => $username,
            'password' => password_hash($password, PASSWORD_DEFAULT)
        ]);

        return redirect()->to('/user-nou')->with('success', 'Utilizator adăugat cu succes.');
    }

    public function editareRegistru()
    {
        $username = session('username');
        $file = WRITEPATH . $username . '_registru.json';

        $rawRows = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

        // Creezi o listă de index + rând, sortată
        $rows = [];

        foreach ($rawRows as $index => $entry) {
            $rows[] = ['index' => $index] + $entry; // adaugi cheia reală
        }

        usort($rows, fn ($a, $b) => strcmp($a['data'], $b['data']));
        return view('dashboard/editare_registru', ['rows' => $rows]);
    }

    public function editareInregistrare($id)
    {
        $username = session('username');
        $file = WRITEPATH . $username . '_registru.json';

        $rows = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

        if (!isset($rows[$id])) {
            return redirect()->to('/editare-registru')->with('error', 'Intrarea nu există.');
        }

        return view('dashboard/editare_inregistrare', ['entry' => $rows[$id], 'id' => $id]);
    }

    public function salveazaInregistrare($id)
    {
        $username = session('username');
        $file = WRITEPATH . $username . '_registru.json';

        $rows = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

        if (!isset($rows[$id])) {
            return redirect()->to('/editare-registru')->with('error', 'Intrarea nu există.');
        }

        $rows[$id]['data']              = $this->request->getPost('data');
        $rows[$id]['tip']               = $this->request->getPost('tip');
        $rows[$id]['suma']              = (float) $this->request->getPost('suma');
        $rows[$id]['valuta']            = $this->request->getPost('valuta');
        $rows[$id]['metoda']            = $this->request->getPost('metoda');
        $rows[$id]['document']          = $this->request->getPost('document');
        $rows[$id]['deductibilitate']   = (int)$this->request->getPost('deductibilitate');
        $rows[$id]['tip_cheltuiala']    = $this->request->getPost('tip_cheltuiala');

        file_put_contents($file, json_encode($rows, JSON_PRETTY_PRINT));
        $this->registruGenerator();
        return redirect()->to('/editare-registru')->with('success', 'Intrarea a fost actualizată.');
    }

    public function stergeInregistrare($id)
    {
        $username = session('username');
        $file = WRITEPATH . $username . '_registru.json';

        if (!file_exists($file)) {
            return redirect()->to('/editare-registru')->with('error', 'Fișierul nu există.');
        }

        $rows = json_decode(file_get_contents($file), true);

        if (!isset($rows[$id])) {
            return redirect()->to('/editare-registru')->with('error', 'Intrarea nu a fost găsită.');
        }

        // Eliminăm elementul
        unset($rows[$id]);

        // Reindexăm array-ul pentru a păstra cheile corecte
        $rows = array_values($rows);

        // Salvăm modificările
        file_put_contents($file, json_encode($rows, JSON_PRETTY_PRINT));
        $this->registruGenerator();
        return redirect()->to('/editare-registru')->with('success', 'Intrarea a fost ștearsă.');
    }
}