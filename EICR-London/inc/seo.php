<?php
if(!defined('ABSPATH'))exit;
function eicr_seo_plugin_active(){return defined('WPSEO_VERSION')||defined('RANK_MATH_VERSION')||defined('AIOSEO_VERSION')||defined('SEOPRESS_VERSION')||defined('THE_SEO_FRAMEWORK_VERSION')||defined('SLIM_SEO_VERSION');}
function eicr_seo_page_data(){
 $name='EICR in London';
 $map=[
  'services'=>['Property Compliance Services in London | '.$name,'Browse electrical, gas, fire safety, energy and property compliance services for residential and commercial properties across London and the M25.'],
  'pricing'=>['Property Certificate Prices in London | '.$name,'View starting prices for EICR, gas safety, EPC, fire risk, PAT testing and other property inspections across London and the M25.'],
  'areas'=>['London & M25 Service Areas | '.$name,'Property certificates, safety inspections and compliance services across Central, North, East, South and West London and suitable M25 locations.'],
  'about'=>['About Our London Compliance Team | '.$name,'Learn about EICR in London and our coordinated property certification, inspection and safety services for domestic and commercial clients.'],
  'booking'=>['Book a Property Inspection in London | '.$name,'Book residential or commercial property inspections in London, choose multiple services and select your preferred inspection date online.'],
  'contact'=>['Contact EICR in London | Property Inspections','Contact our team for electrical, gas, energy, fire safety and property compliance services across London and suitable M25 locations.'],
  'request-a-quote'=>['Request a Property Compliance Quote | '.$name,'Request a tailored quotation for residential or commercial property certificates, inspections and safety services across London.'],
  'sign-in'=>['Customer Sign In | '.$name,'Secure customer sign in for bookings, job progress and completed PDF certificates.'],
  'create-account'=>['Create Customer Account | '.$name,'Create a secure customer account for bookings and certificate access.'],
  'reset-password'=>['Reset Customer Password | '.$name,'Securely reset your EICR in London customer account password.'],
  'my-account'=>['My Account | '.$name,'View customer bookings, job progress and completed PDF certificates.'],
  'staff-login'=>['Staff Login | '.$name,'Private operations staff sign in.'],
  'staff-dashboard'=>['Staff Dashboard | '.$name,'Private operations workspace.'],
  'privacy'=>['Privacy Policy | '.$name,'Read how EICR in London handles customer information submitted through enquiries, quotations and online booking requests.'],
  'cookies'=>['Cookie Policy | '.$name,'Read how essential technologies and optional analytics or campaign measurement may be used on the EICR in London website.'],
  'terms'=>['Terms & Conditions | '.$name,'Read the booking, quotation, appointment and service terms for EICR in London property compliance services.']
 ];
 if(is_front_page())return ['EICR in London | Property Certificates & Inspections','Property certificates, inspections and safety services for landlords, homeowners, agents and commercial properties across London and the M25.'];
 if(is_singular('eicr_service')){$title=get_the_title();return [$title.' in London | '.$name,wp_strip_all_tags(get_the_excerpt()?:'Professional '.$title.' for residential and commercial properties across London and suitable M25 locations. Request a quote or book online.')];}
 if(is_page()){$slug=get_post_field('post_name',get_queried_object_id());if(isset($map[$slug]))return $map[$slug];}
 $fallback_title=is_singular()?single_post_title('',false):get_bloginfo('name');
 if(is_post_type_archive('eicr_service'))$fallback_title='Property Compliance Services in London';
 return [trim($fallback_title.' | '.$name,' |'),get_bloginfo('description')?:'London property certificates, inspections and safety services for residential and commercial clients.'];
}
add_action('init',function(){if(get_option('blogname')==='My WordPress Website'||!trim(get_option('blogname')))update_option('blogname','EICR in London');if(get_option('blogdescription')==='Just another WordPress site'||!trim(get_option('blogdescription')))update_option('blogdescription','London Property Certificates & Safety Inspections');},5);
add_filter('pre_get_document_title',function($title){if(eicr_seo_plugin_active())return $title;$data=eicr_seo_page_data();return $data[0]?:$title;},20);
add_filter('wp_robots',function($robots){if(is_page(['sign-in','create-account','reset-password','my-account','staff-login','staff-dashboard','booking'])){$robots['noindex']=true;$robots['follow']=true;unset($robots['index']);return$robots;}if(!is_admin()&&!is_search()&&!is_404()){$robots['index']=true;$robots['follow']=true;$robots['max-image-preview']='large';$robots['max-snippet']=-1;$robots['max-video-preview']=-1;}return $robots;});
add_action('after_setup_theme',function(){if(!eicr_seo_plugin_active())remove_action('wp_head','rel_canonical');});
add_action('wp_head',function(){if(eicr_seo_plugin_active()||is_404()||is_search())return;$data=eicr_seo_page_data();$title=$data[0];$description=wp_html_excerpt(wp_strip_all_tags($data[1]),160,'');$url=is_front_page()?home_url('/'):(is_singular()?get_permalink():home_url('/'));$image=EICR_THEME_URI.'/assets/images/gas-electrical-installations-closeup.webp';echo "\n".'<meta name="description" content="'.esc_attr($description).'">';echo "\n".'<link rel="canonical" href="'.esc_url($url).'">';echo "\n".'<meta property="og:type" content="'.(is_singular('eicr_service')?'article':'website').'">';echo "\n".'<meta property="og:site_name" content="EICR in London">';echo "\n".'<meta property="og:title" content="'.esc_attr($title).'">';echo "\n".'<meta property="og:description" content="'.esc_attr($description).'">';echo "\n".'<meta property="og:url" content="'.esc_url($url).'">';echo "\n".'<meta property="og:image" content="'.esc_url($image).'">';echo "\n".'<meta name="twitter:card" content="summary_large_image">';echo "\n".'<meta name="twitter:title" content="'.esc_attr($title).'">';echo "\n".'<meta name="twitter:description" content="'.esc_attr($description).'">';echo "\n".'<meta name="twitter:image" content="'.esc_url($image).'">' . "\n";},3);
