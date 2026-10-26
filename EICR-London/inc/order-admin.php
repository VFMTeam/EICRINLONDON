<?php
if (!defined('ABSPATH')) exit;

function eicr_order_data($post_id) {
    $data = get_post_meta($post_id, '_eicr_data', true);
    return is_array($data) ? $data : [];
}

function eicr_order_service_names($data) {
    if (!empty($data['services']) && is_array($data['services'])) return array_map('sanitize_text_field', $data['services']);
    if (!empty($data['service'])) return array_map('trim', explode(',', (string) $data['service']));
    return [];
}

add_filter('manage_eicr_order_posts_columns', function () {
    return [
        'cb' => '<input type="checkbox">',
        'eicr_work' => 'Work order',
        'eicr_client' => 'Client',
        'eicr_location' => 'Postcode & address',
        'eicr_visit' => 'Inspection',
        'eicr_total' => 'Total',
        'eicr_payment' => 'Payment',
        'date' => 'Received',
    ];
});

add_action('manage_eicr_order_posts_custom_column', function ($column, $post_id) {
    $data = eicr_order_data($post_id);
    if ($column === 'eicr_work') {
        $services = eicr_order_service_names($data);
        echo '<a class="eicr-order-ref" href="' . esc_url(get_edit_post_link($post_id)) . '">' . esc_html($data['reference'] ?? get_the_title($post_id)) . '</a>';
        echo '<strong class="eicr-order-service">' . esc_html($services ? implode(', ', $services) : 'Service not recorded') . '</strong>';
    }
    if ($column === 'eicr_client') {
        echo '<strong>' . esc_html($data['name'] ?? '—') . '</strong>';
        if (!empty($data['phone'])) echo '<a href="tel:' . esc_attr($data['phone']) . '">' . esc_html($data['phone']) . '</a>';
        if (!empty($data['email'])) echo '<a href="mailto:' . esc_attr($data['email']) . '">' . esc_html($data['email']) . '</a>';
    }
    if ($column === 'eicr_location') {
        echo '<strong>' . esc_html($data['postcode'] ?? '—') . '</strong>';
        echo '<span>' . esc_html($data['address'] ?? 'Address not recorded') . '</span>';
    }
    if ($column === 'eicr_visit') {
        echo '<strong>' . esc_html($data['date'] ?? 'Date pending') . '</strong>';
        if (!empty($data['time_slot'])) echo '<span>' . esc_html($data['time_slot']) . '</span>';
        if (!empty($data['property_type'])) echo '<small>' . esc_html($data['property_type']) . '</small>';
    }
    if ($column === 'eicr_total') echo '<strong class="eicr-order-total">£' . esc_html(number_format((float) ($data['amount'] ?? 0), 2)) . '</strong>';
    if ($column === 'eicr_payment') {
        $methods = ['stripe' => 'Card', 'bank' => 'Bank transfer', 'cash' => 'Cash'];
        $status = $data['status'] ?? 'Pending';
        echo '<span class="eicr-status eicr-status-' . esc_attr(sanitize_html_class(strtolower($status))) . '">' . esc_html($status) . '</span>';
        echo '<small>' . esc_html($methods[$data['payment_method'] ?? ''] ?? ucwords((string) ($data['payment_method'] ?? 'Not selected'))) . '</small>';
    }
}, 10, 2);

add_action('restrict_manage_posts', function ($post_type) {
    if ($post_type !== 'eicr_order' || !current_user_can('manage_options')) return;
    $csv = wp_nonce_url(admin_url('admin-post.php?action=eicr_export_orders_csv'), 'eicr_export_orders');
    $ics = wp_nonce_url(admin_url('admin-post.php?action=eicr_export_orders_ics'), 'eicr_export_orders');
    echo '<a class="button eicr-export-button" href="' . esc_url($csv) . '">Export for Sheets (CSV)</a>';
    echo '<a class="button eicr-export-button" href="' . esc_url($ics) . '">Export calendar (ICS)</a>';
});

function eicr_export_orders_query() {
    return get_posts(['post_type' => 'eicr_order', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'date', 'order' => 'DESC']);
}

add_action('admin_post_eicr_export_orders_csv', function () {
    if (!current_user_can('manage_options')) wp_die('Not allowed.');
    check_admin_referer('eicr_export_orders');
    nocache_headers();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=eicr-bookings-' . gmdate('Y-m-d') . '.csv');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Work order', 'Client name', 'Email', 'Phone', 'Services', 'Property type', 'Postcode', 'Address', 'Inspection date', 'Time', 'Total GBP', 'Payment method', 'Payment status', 'Notes', 'Received']);
    foreach (eicr_export_orders_query() as $order) {
        $d = eicr_order_data($order->ID);
        fputcsv($out, [
            $d['reference'] ?? $order->post_title,
            $d['name'] ?? '',
            $d['email'] ?? '',
            $d['phone'] ?? '',
            implode(' | ', eicr_order_service_names($d)),
            $d['property_type'] ?? '',
            $d['postcode'] ?? '',
            $d['address'] ?? '',
            $d['date'] ?? '',
            $d['time_slot'] ?? '',
            number_format((float) ($d['amount'] ?? 0), 2, '.', ''),
            $d['payment_method'] ?? '',
            $d['status'] ?? 'Pending',
            $d['notes'] ?? '',
            get_the_date('Y-m-d H:i', $order),
        ]);
    }
    fclose($out);
    exit;
});

function eicr_ics_escape($value) {
    return str_replace(["\\", ",", ";", "\r\n", "\n", "\r"], ["\\\\", "\\,", "\\;", "\\n", "\\n", "\\n"], (string) $value);
}

add_action('admin_post_eicr_export_orders_ics', function () {
    if (!current_user_can('manage_options')) wp_die('Not allowed.');
    check_admin_referer('eicr_export_orders');
    nocache_headers();
    header('Content-Type: text/calendar; charset=utf-8');
    header('Content-Disposition: attachment; filename=eicr-bookings-' . gmdate('Y-m-d') . '.ics');
    echo "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EICR in London//Bookings//EN\r\nCALSCALE:GREGORIAN\r\n";
    foreach (eicr_export_orders_query() as $order) {
        $d = eicr_order_data($order->ID);
        if (empty($d['date'])) continue;
        $start = preg_match('/01:00 PM/i', (string) ($d['time_slot'] ?? '')) ? '130000' : '080000';
        $end = $start === '130000' ? '180000' : '130000';
        $day = preg_replace('/\D/', '', (string) $d['date']);
        if (strlen($day) !== 8) $day = gmdate('Ymd', strtotime((string) $d['date']));
        $services = implode(', ', eicr_order_service_names($d));
        $description = trim($services . "\nClient: " . ($d['name'] ?? '') . "\nPhone: " . ($d['phone'] ?? '') . "\nPostcode: " . ($d['postcode'] ?? '') . "\nNotes: " . ($d['notes'] ?? ''));
        echo "BEGIN:VEVENT\r\n";
        echo 'UID:' . eicr_ics_escape(($d['reference'] ?? $order->ID) . '@eicrinlondon') . "\r\n";
        echo 'DTSTAMP:' . gmdate('Ymd\THis\Z') . "\r\n";
        echo 'DTSTART:' . $day . 'T' . $start . "\r\n";
        echo 'DTEND:' . $day . 'T' . $end . "\r\n";
        echo 'SUMMARY:' . eicr_ics_escape($services . ' — ' . ($d['name'] ?? 'Client')) . "\r\n";
        echo 'LOCATION:' . eicr_ics_escape(trim(($d['address'] ?? '') . ', ' . ($d['postcode'] ?? ''), ', ')) . "\r\n";
        echo 'DESCRIPTION:' . eicr_ics_escape($description) . "\r\n";
        echo "END:VEVENT\r\n";
    }
    echo "END:VCALENDAR\r\n";
    exit;
});

add_action('add_meta_boxes_eicr_order', function () {
    remove_meta_box('eicr_record', 'eicr_order', 'normal');
    add_meta_box('eicr_booking_details', 'Booking details', 'eicr_order_details_box', 'eicr_order', 'normal', 'high');
});

function eicr_order_details_box($post) {
    $d = eicr_order_data($post->ID);
    $groups = [
        'Work order' => [
            'Reference' => $d['reference'] ?? $post->post_title,
            'Services' => implode(', ', eicr_order_service_names($d)),
            'Job status' => function_exists('eicr_job_progress') ? eicr_job_progress($post->ID, $d)['label'] : ($d['job_status'] ?? 'Awaiting certificates'),
            'Property type' => $d['property_type'] ?? '',
            'Inspection' => trim(($d['date'] ?? '') . ' ' . ($d['time_slot'] ?? '')),
        ],
        'Client' => [
            'Name' => $d['name'] ?? '',
            'Email' => $d['email'] ?? '',
            'Phone' => $d['phone'] ?? '',
            'Address' => trim(($d['address'] ?? '') . ', ' . ($d['postcode'] ?? ''), ', '),
        ],
        'Payment' => [
            'Total' => '£' . number_format((float) ($d['amount'] ?? 0), 2),
            'Method' => ucwords((string) ($d['payment_method'] ?? '')),
            'Status' => $d['status'] ?? 'Pending',
            'Notes for engineer' => $d['notes'] ?? '',
        ],
    ];
    echo '<div class="eicr-booking-detail-grid">';
    foreach ($groups as $title => $rows) {
        echo '<section><h3>' . esc_html($title) . '</h3><dl>';
        foreach ($rows as $label => $value) echo '<div><dt>' . esc_html($label) . '</dt><dd>' . nl2br(esc_html($value ?: '—')) . '</dd></div>';
        echo '</dl></section>';
    }
    echo '</div>';
}

add_action('admin_enqueue_scripts', function ($hook) {
    $screen = get_current_screen();
    if (!$screen || $screen->post_type !== 'eicr_order') return;
    wp_add_inline_style('wp-admin', '
        .post-type-eicr_order .wp-list-table{border:0;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(15,23,42,.08)}
        .post-type-eicr_order .wp-list-table thead th{background:#111827;color:#fff;font-weight:700}
        .post-type-eicr_order .wp-list-table tbody tr:nth-child(even){background:#f8fafc}
        .post-type-eicr_order .column-eicr_work{width:21%}.post-type-eicr_order .column-eicr_client{width:16%}.post-type-eicr_order .column-eicr_location{width:20%}
        .post-type-eicr_order td span,.post-type-eicr_order td small,.post-type-eicr_order td a{display:block;margin-top:4px}
        .eicr-order-ref{font-size:12px;font-weight:800;color:#b45309}.eicr-order-service{display:block;margin-top:7px;line-height:1.45}.eicr-order-total{font-size:16px}
        .eicr-status{display:inline-block!important;border-radius:999px;background:#fef3c7;color:#92400e;padding:3px 8px;font-size:11px;font-weight:800}
        .eicr-status-paid{background:#dcfce7;color:#166534}.eicr-export-button{margin-right:6px!important}
        .eicr-booking-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.eicr-booking-detail-grid section{border:1px solid #dcdcde;border-top:4px solid #ffd400;border-radius:10px;background:#fff;padding:18px}
        .eicr-booking-detail-grid h3{margin:0 0 14px;font-size:17px}.eicr-booking-detail-grid dl{margin:0}.eicr-booking-detail-grid dl div{padding:9px 0;border-top:1px solid #eef0f2}.eicr-booking-detail-grid dt{font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b}.eicr-booking-detail-grid dd{margin:4px 0 0;font-weight:600}
        @media(max-width:1100px){.eicr-booking-detail-grid{grid-template-columns:1fr}.post-type-eicr_order .column-eicr_location{display:none}}
    ');
});

add_filter('post_row_actions',function($actions,$post){return $post->post_type==='eicr_order'?[]:$actions;},999,2);

add_action('restrict_manage_posts',function($post_type){
 if($post_type!=='eicr_order'||!current_user_can('manage_options'))return;$url=wp_nonce_url(admin_url('admin-post.php?action=eicr_sync_stripe_payments'),'eicr_sync_stripe_payments');echo '<a class="button eicr-export-button" href="'.esc_url($url).'">Sync Stripe payments</a>';
},20);

add_action('admin_post_eicr_sync_stripe_payments',function(){
 if(!current_user_can('manage_options'))wp_die('Not allowed.');check_admin_referer('eicr_sync_stripe_payments');$updated=0;$checked=0;$failed=0;
 foreach(eicr_export_orders_query() as $order){$d=eicr_order_data($order->ID);if(($d['payment_method']??'')!=='stripe'||($d['status']??'')==='Paid')continue;$checked++;$intent_id=$d['stripe_payment_intent']??$d['stripe_payment']??'';$intent=$intent_id?eicr_retrieve_payment_intent($intent_id):eicr_find_payment_intent_by_reference($d['reference']??'');if(is_wp_error($intent)){$failed++;continue;}$result=eicr_mark_order_paid_from_intent($order->ID,$intent);if(is_wp_error($result)){$failed++;continue;}$updated++;}
 $url=add_query_arg(['post_type'=>'eicr_order','eicr_sync'=>'1','updated'=>$updated,'checked'=>$checked,'failed'=>$failed],admin_url('edit.php'));wp_safe_redirect($url);exit;
});
add_action('admin_notices',function(){
 if(!isset($_GET['eicr_sync'])||get_current_screen()->post_type!=='eicr_order')return;$updated=absint($_GET['updated']??0);$checked=absint($_GET['checked']??0);$failed=absint($_GET['failed']??0);echo '<div class="notice notice-success is-dismissible"><p><strong>Stripe payment sync complete.</strong> '.esc_html($updated).' marked Paid; '.esc_html($checked).' pending card booking(s) checked'.($failed?' ; '.esc_html($failed).' could not be matched or are not successful yet':'').'.</p></div>';
});
function eicr_auto_reconcile_stripe_payments(){
 $processed=0;foreach(eicr_export_orders_query() as $order){if($processed>=20)break;$d=eicr_order_data($order->ID);if(($d['payment_method']??'')!=='stripe'||($d['status']??'')==='Paid')continue;$processed++;$intent_id=$d['stripe_payment_intent']??$d['stripe_payment']??'';$intent=$intent_id?eicr_retrieve_payment_intent($intent_id):eicr_find_payment_intent_by_reference($d['reference']??'');if(is_wp_error($intent))continue;eicr_mark_order_paid_from_intent($order->ID,$intent);}
}
add_filter('cron_schedules',function($schedules){$schedules['eicr_fifteen_minutes']=['interval'=>900,'display'=>'Every 15 minutes'];return $schedules;});
add_action('init',function(){if(!wp_next_scheduled('eicr_stripe_reconcile_event'))wp_schedule_event(time()+60,'eicr_fifteen_minutes','eicr_stripe_reconcile_event');});
add_action('eicr_stripe_reconcile_event','eicr_auto_reconcile_stripe_payments');
add_action('switch_theme',function(){$timestamp=wp_next_scheduled('eicr_stripe_reconcile_event');if($timestamp)wp_unschedule_event($timestamp,'eicr_stripe_reconcile_event');});
