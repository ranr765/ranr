import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Navarasa - School of Indian Dance | Switzerland</title>
    <meta name="description" content="Navarasa School of Indian Dance in Switzerland. Learn Bharatanatyam, Mohiniyattam, and Bollywood dance with Sumi Ranjith. Classes for all ages and levels.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Lato:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

      :root {
        --maroon: #7B1113;
        --maroon-dark: #5A0C0E;
        --gold: #C8A96E;
        --gold-light: #E8D5A8;
        --gold-dark: #9E7E42;
        --ivory: #FFF8F0;
        --ivory-dark: #F5EDE0;
        --dark: #1A0A0B;
        --text: #2D1810;
        --text-light: #6B5B54;
      }

      html { scroll-behavior: smooth; }

      body {
        font-family: 'Lato', sans-serif;
        color: var(--text);
        background: var(--ivory);
        overflow-x: hidden;
        line-height: 1.7;
      }

      h1, h2, h3, h4 {
        font-family: 'Playfair Display', serif;
        line-height: 1.2;
      }

      /* ===== NAVIGATION ===== */
      .nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        padding: 1rem 2rem;
        transition: all 0.4s ease;
      }

      .nav.scrolled {
        background: rgba(26, 10, 11, 0.95);
        backdrop-filter: blur(10px);
        padding: 0.6rem 2rem;
        box-shadow: 0 2px 20px rgba(0,0,0,0.3);
      }

      .nav-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .nav-logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        color: white;
      }

      .nav-logo-icon {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-logo-icon svg {
        width: 42px;
        height: 42px;
      }

      .nav-logo-text {
        font-family: 'Playfair Display', serif;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 2px;
      }

      .nav-logo-sub {
        font-family: 'Lato', sans-serif;
        font-size: 0.6rem;
        letter-spacing: 3px;
        text-transform: uppercase;
        opacity: 0.8;
        display: block;
        margin-top: -2px;
      }

      .nav-links {
        display: flex;
        align-items: center;
        gap: 2rem;
        list-style: none;
      }

      .nav-links a {
        color: white;
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        position: relative;
        padding: 4px 0;
        transition: color 0.3s;
      }

      .nav-links a::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 2px;
        background: var(--gold);
        transition: width 0.3s;
      }

      .nav-links a:hover::after { width: 100%; }
      .nav-links a:hover { color: var(--gold-light); }

      .nav-cta {
        background: var(--gold) !important;
        color: var(--dark) !important;
        padding: 10px 24px !important;
        border-radius: 4px;
        font-weight: 700 !important;
        letter-spacing: 1px !important;
        transition: all 0.3s !important;
      }

      .nav-cta:hover {
        background: var(--gold-light) !important;
        transform: translateY(-1px);
      }

      .nav-cta::after { display: none !important; }

      /* Mobile hamburger */
      .hamburger {
        display: none;
        flex-direction: column;
        gap: 5px;
        cursor: pointer;
        background: none;
        border: none;
        padding: 4px;
      }

      .hamburger span {
        width: 26px;
        height: 2px;
        background: white;
        transition: all 0.3s;
        display: block;
      }

      .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
      .hamburger.active span:nth-child(2) { opacity: 0; }
      .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

      /* ===== HERO ===== */
      .hero {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: var(--dark);
        overflow: hidden;
      }

      .hero-bg {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse at 20% 50%, rgba(123, 17, 19, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 50%, rgba(200, 169, 110, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(123, 17, 19, 0.2) 0%, transparent 40%);
      }

      .hero-pattern {
        position: absolute;
        inset: 0;
        opacity: 0.04;
        background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8A96E'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      }

      .hero-content {
        position: relative;
        z-index: 2;
        text-align: center;
        color: white;
        padding: 2rem;
        max-width: 900px;
      }

      .hero-ornament {
        width: 60px;
        height: 2px;
        background: var(--gold);
        margin: 0 auto 1.5rem;
        position: relative;
      }

      .hero-ornament::before {
        content: '';
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 8px;
        height: 8px;
        background: var(--gold);
        border-radius: 50%;
      }

      .hero-subtitle {
        font-family: 'Lato', sans-serif;
        font-size: 0.85rem;
        letter-spacing: 6px;
        text-transform: uppercase;
        color: var(--gold);
        margin-bottom: 1.5rem;
        font-weight: 600;
      }

      .hero h1 {
        font-size: clamp(2.8rem, 6vw, 5rem);
        font-weight: 800;
        margin-bottom: 0.5rem;
        line-height: 1.1;
      }

      .hero h1 span {
        color: var(--gold);
        font-style: italic;
      }

      .hero-tagline {
        font-family: 'Playfair Display', serif;
        font-size: clamp(1.1rem, 2vw, 1.4rem);
        font-style: italic;
        color: var(--gold-light);
        margin-bottom: 2rem;
        opacity: 0.9;
      }

      .hero-desc {
        font-size: 1.05rem;
        max-width: 600px;
        margin: 0 auto 2.5rem;
        color: rgba(255,255,255,0.75);
        line-height: 1.8;
      }

      .hero-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn {
        display: inline-block;
        padding: 14px 36px;
        font-family: 'Lato', sans-serif;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        text-decoration: none;
        border-radius: 4px;
        transition: all 0.3s;
        cursor: pointer;
        border: none;
      }

      .btn-gold {
        background: var(--gold);
        color: var(--dark);
      }

      .btn-gold:hover {
        background: var(--gold-light);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(200, 169, 110, 0.3);
      }

      .btn-outline {
        background: transparent;
        color: white;
        border: 2px solid rgba(255,255,255,0.4);
      }

      .btn-outline:hover {
        border-color: var(--gold);
        color: var(--gold);
        transform: translateY(-2px);
      }

      .hero-scroll {
        position: absolute;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        color: var(--gold);
        font-size: 0.7rem;
        letter-spacing: 3px;
        text-transform: uppercase;
        text-decoration: none;
        animation: float 3s ease-in-out infinite;
      }

      .hero-scroll svg {
        display: block;
        margin: 0.5rem auto 0;
        width: 20px;
        height: 20px;
      }

      @keyframes float {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(8px); }
      }

      /* ===== SECTIONS ===== */
      section {
        padding: 6rem 2rem;
      }

      .section-inner {
        max-width: 1200px;
        margin: 0 auto;
      }

      .section-header {
        text-align: center;
        margin-bottom: 4rem;
      }

      .section-label {
        font-family: 'Lato', sans-serif;
        font-size: 0.75rem;
        letter-spacing: 4px;
        text-transform: uppercase;
        color: var(--gold-dark);
        margin-bottom: 0.75rem;
        font-weight: 700;
      }

      .section-title {
        font-size: clamp(2rem, 4vw, 2.8rem);
        color: var(--dark);
        margin-bottom: 1rem;
      }

      .section-divider {
        width: 50px;
        height: 2px;
        background: var(--gold);
        margin: 1.5rem auto;
        position: relative;
      }

      .section-divider::before {
        content: '';
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 8px;
        height: 8px;
        background: var(--gold);
        border-radius: 50%;
      }

      .section-subtitle {
        font-size: 1.05rem;
        color: var(--text-light);
        max-width: 600px;
        margin: 0 auto;
      }

      /* ===== ABOUT ===== */
      .about { background: white; }

      .about-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
      }

      .about-image {
        position: relative;
      }

      .about-image-frame {
        aspect-ratio: 3/4;
        background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .about-image-frame::before {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid var(--gold);
        border-radius: 4px;
        opacity: 0.3;
      }

      .about-image-inner {
        text-align: center;
        color: white;
        padding: 2rem;
      }

      .about-image-inner svg {
        width: 120px;
        height: 120px;
        margin-bottom: 1.5rem;
        opacity: 0.6;
      }

      .about-image-name {
        font-family: 'Playfair Display', serif;
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
      }

      .about-image-role {
        font-size: 0.85rem;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--gold);
        font-weight: 600;
      }

      .about-text h3 {
        font-size: 1.8rem;
        color: var(--maroon);
        margin-bottom: 1.5rem;
      }

      .about-text p {
        margin-bottom: 1.2rem;
        color: var(--text-light);
        font-size: 1.02rem;
      }

      .about-quote {
        border-left: 3px solid var(--gold);
        padding-left: 1.5rem;
        margin: 2rem 0;
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 1.15rem;
        color: var(--maroon);
      }

      .about-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid var(--ivory-dark);
      }

      .about-stat-number {
        font-family: 'Playfair Display', serif;
        font-size: 2rem;
        font-weight: 700;
        color: var(--maroon);
      }

      .about-stat-label {
        font-size: 0.8rem;
        color: var(--text-light);
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      /* ===== DANCE FORMS ===== */
      .dance-forms {
        background: var(--ivory);
      }

      .dance-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }

      .dance-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.4s ease;
        box-shadow: 0 2px 20px rgba(0,0,0,0.04);
      }

      .dance-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.1);
      }

      .dance-card-image {
        height: 240px;
        position: relative;
        overflow: hidden;
      }

      .dance-card-image.bharatanatyam {
        background: linear-gradient(135deg, #7B1113 0%, #2D0506 100%);
      }

      .dance-card-image.mohiniyattam {
        background: linear-gradient(135deg, #1B5E20 0%, #0D2E10 100%);
      }

      .dance-card-image.bollywood {
        background: linear-gradient(135deg, #E65100 0%, #6D2600 100%);
      }

      .dance-card-image-content {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        padding: 1.5rem;
      }

      .dance-card-image-content svg {
        width: 64px;
        height: 64px;
        margin-bottom: 1rem;
        opacity: 0.7;
      }

      .dance-card-image-content .dance-origin {
        font-size: 0.75rem;
        letter-spacing: 3px;
        text-transform: uppercase;
        opacity: 0.7;
      }

      .dance-card-body {
        padding: 2rem;
      }

      .dance-card-body h3 {
        font-size: 1.4rem;
        color: var(--dark);
        margin-bottom: 0.75rem;
      }

      .dance-card-body p {
        color: var(--text-light);
        font-size: 0.95rem;
        margin-bottom: 1.25rem;
      }

      .dance-card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .dance-tag {
        font-size: 0.7rem;
        letter-spacing: 1px;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 20px;
        background: var(--ivory);
        color: var(--text-light);
        font-weight: 600;
      }

      /* ===== SERVICES ===== */
      .services { background: var(--dark); color: white; }

      .services .section-label { color: var(--gold); }
      .services .section-title { color: white; }
      .services .section-subtitle { color: rgba(255,255,255,0.6); }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }

      .service-card {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(200, 169, 110, 0.15);
        border-radius: 8px;
        padding: 2.5rem 2rem;
        text-align: center;
        transition: all 0.4s ease;
      }

      .service-card:hover {
        background: rgba(200, 169, 110, 0.08);
        border-color: rgba(200, 169, 110, 0.3);
        transform: translateY(-4px);
      }

      .service-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(200, 169, 110, 0.1);
      }

      .service-icon svg {
        width: 28px;
        height: 28px;
        color: var(--gold);
      }

      .service-card h3 {
        font-size: 1.2rem;
        margin-bottom: 0.75rem;
        color: var(--gold-light);
      }

      .service-card p {
        color: rgba(255,255,255,0.6);
        font-size: 0.92rem;
        line-height: 1.7;
      }

      /* ===== NAVARASA MEANING ===== */
      .navarasa-section {
        background: white;
      }

      .navarasa-intro {
        text-align: center;
        max-width: 700px;
        margin: 0 auto 3rem;
      }

      .navarasa-intro p {
        color: var(--text-light);
        font-size: 1.02rem;
      }

      .rasa-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }

      .rasa-card {
        text-align: center;
        padding: 2rem 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--ivory-dark);
        transition: all 0.3s;
      }

      .rasa-card:hover {
        border-color: var(--gold);
        box-shadow: 0 4px 20px rgba(200, 169, 110, 0.15);
      }

      .rasa-emoji {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
        display: block;
      }

      .rasa-card h4 {
        font-size: 1.1rem;
        color: var(--maroon);
        margin-bottom: 0.25rem;
      }

      .rasa-card .rasa-sanskrit {
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: 0.85rem;
        color: var(--gold-dark);
        margin-bottom: 0.5rem;
      }

      .rasa-card p {
        font-size: 0.85rem;
        color: var(--text-light);
      }

      /* ===== SCHEDULE ===== */
      .schedule { background: var(--ivory); }

      .schedule-table-wrap {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 20px rgba(0,0,0,0.05);
      }

      .schedule-table {
        width: 100%;
        border-collapse: collapse;
      }

      .schedule-table thead {
        background: var(--maroon);
        color: white;
      }

      .schedule-table th {
        padding: 1rem 1.5rem;
        text-align: left;
        font-family: 'Lato', sans-serif;
        font-size: 0.8rem;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        font-weight: 700;
      }

      .schedule-table td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--ivory-dark);
        font-size: 0.95rem;
      }

      .schedule-table tbody tr:hover {
        background: var(--ivory);
      }

      .schedule-table tbody tr:last-child td {
        border-bottom: none;
      }

      .schedule-level {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .level-all { background: #E8F5E9; color: #2E7D32; }
      .level-beginner { background: #E3F2FD; color: #1565C0; }
      .level-intermediate { background: #FFF3E0; color: #E65100; }
      .level-advanced { background: #FCE4EC; color: #C62828; }

      .schedule-note {
        text-align: center;
        margin-top: 2rem;
        color: var(--text-light);
        font-size: 0.92rem;
      }

      .schedule-note a {
        color: var(--maroon);
        font-weight: 600;
        text-decoration: none;
      }

      .schedule-note a:hover { text-decoration: underline; }

      /* ===== TESTIMONIALS ===== */
      .testimonials { background: white; }

      .testimonials-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }

      .testimonial-card {
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid var(--ivory-dark);
        position: relative;
      }

      .testimonial-card::before {
        content: '\\201C';
        font-family: 'Playfair Display', serif;
        font-size: 4rem;
        color: var(--gold);
        position: absolute;
        top: 0.5rem;
        left: 1.5rem;
        line-height: 1;
        opacity: 0.5;
      }

      .testimonial-text {
        font-style: italic;
        color: var(--text-light);
        margin-bottom: 1.5rem;
        padding-top: 1.5rem;
        font-size: 0.95rem;
      }

      .testimonial-author {
        font-weight: 700;
        color: var(--dark);
        font-size: 0.9rem;
      }

      .testimonial-role {
        font-size: 0.8rem;
        color: var(--text-light);
      }

      /* ===== CONTACT ===== */
      .contact {
        background: var(--ivory);
      }

      .contact-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
      }

      .contact-info h3 {
        font-size: 1.6rem;
        color: var(--maroon);
        margin-bottom: 1rem;
      }

      .contact-info p {
        color: var(--text-light);
        margin-bottom: 2rem;
        font-size: 0.95rem;
      }

      .contact-detail {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .contact-detail-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--maroon);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .contact-detail-icon svg {
        width: 18px;
        height: 18px;
        color: var(--gold);
      }

      .contact-detail-text strong {
        display: block;
        font-size: 0.85rem;
        margin-bottom: 0.2rem;
        color: var(--dark);
      }

      .contact-detail-text span,
      .contact-detail-text a {
        color: var(--text-light);
        font-size: 0.92rem;
        text-decoration: none;
      }

      .contact-detail-text a:hover { color: var(--maroon); }

      .social-links {
        display: flex;
        gap: 0.75rem;
        margin-top: 2rem;
      }

      .social-link {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--dark);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        text-decoration: none;
      }

      .social-link:hover {
        background: var(--maroon);
        transform: translateY(-2px);
      }

      .social-link svg {
        width: 18px;
        height: 18px;
        color: white;
      }

      .contact-form {
        background: white;
        padding: 2.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 20px rgba(0,0,0,0.05);
      }

      .form-group {
        margin-bottom: 1.25rem;
      }

      .form-group label {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--dark);
        margin-bottom: 0.5rem;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: 'Lato', sans-serif;
        font-size: 0.95rem;
        transition: border-color 0.3s;
        background: var(--ivory);
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--gold);
        box-shadow: 0 0 0 3px rgba(200, 169, 110, 0.1);
      }

      .form-group textarea { resize: vertical; min-height: 120px; }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .btn-submit {
        width: 100%;
        padding: 14px;
        background: var(--maroon);
        color: white;
        font-family: 'Lato', sans-serif;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-submit:hover {
        background: var(--maroon-dark);
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(123, 17, 19, 0.3);
      }

      .form-success {
        display: none;
        text-align: center;
        padding: 2rem;
      }

      .form-success svg {
        width: 48px;
        height: 48px;
        color: #2E7D32;
        margin-bottom: 1rem;
      }

      .form-success h3 {
        color: var(--dark);
        margin-bottom: 0.5rem;
      }

      .form-success p {
        color: var(--text-light);
        font-size: 0.92rem;
      }

      /* ===== FOOTER ===== */
      .footer {
        background: var(--dark);
        color: rgba(255,255,255,0.6);
        padding: 4rem 2rem 2rem;
      }

      .footer-inner {
        max-width: 1200px;
        margin: 0 auto;
      }

      .footer-top {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 3rem;
        margin-bottom: 3rem;
        padding-bottom: 3rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .footer-brand .nav-logo {
        margin-bottom: 1rem;
        display: inline-flex;
      }

      .footer-brand p {
        font-size: 0.9rem;
        line-height: 1.7;
        max-width: 300px;
      }

      .footer-col h4 {
        font-family: 'Lato', sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--gold);
        margin-bottom: 1.25rem;
      }

      .footer-col ul {
        list-style: none;
      }

      .footer-col li { margin-bottom: 0.6rem; }

      .footer-col a {
        color: rgba(255,255,255,0.6);
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.3s;
      }

      .footer-col a:hover { color: var(--gold); }

      .footer-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
      }

      .footer-bottom a {
        color: var(--gold);
        text-decoration: none;
      }

      /* ===== ANIMATIONS ===== */
      .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }

      .fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }

      /* ===== RESPONSIVE ===== */
      @media (max-width: 968px) {
        .nav-links { display: none; }
        .nav-links.open {
          display: flex;
          flex-direction: column;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(26, 10, 11, 0.98);
          padding: 1.5rem 2rem;
          gap: 1rem;
        }
        .hamburger { display: flex; }
        .about-grid { grid-template-columns: 1fr; gap: 2rem; }
        .about-image { order: -1; }
        .about-image-frame { aspect-ratio: 16/9; }
        .dance-cards { grid-template-columns: 1fr; }
        .services-grid { grid-template-columns: 1fr; }
        .rasa-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .testimonials-grid { grid-template-columns: 1fr; }
        .contact-grid { grid-template-columns: 1fr; }
        .footer-top { grid-template-columns: 1fr 1fr; gap: 2rem; }
        .schedule-table-wrap { overflow-x: auto; }
      }

      @media (max-width: 640px) {
        section { padding: 4rem 1.25rem; }
        .rasa-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
        .rasa-card { padding: 1rem 0.5rem; }
        .rasa-emoji { font-size: 1.5rem; }
        .rasa-card h4 { font-size: 0.8rem; }
        .rasa-card .rasa-sanskrit { font-size: 0.7rem; }
        .rasa-card p { font-size: 0.7rem; }
        .about-stats { grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .form-row { grid-template-columns: 1fr; }
        .footer-top { grid-template-columns: 1fr; }
        .footer-bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
        .hero-buttons { flex-direction: column; align-items: center; }
      }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="nav" id="navbar">
      <div class="nav-inner">
        <a href="#" class="nav-logo">
          <div class="nav-logo-icon">
            <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="24" stroke="#C8A96E" stroke-width="1.5"/>
              <path d="M25 8C25 8 18 15 18 22C18 26 20 28 22 30C19 31 16 33 16 37C16 41 20 44 25 44C30 44 34 41 34 37C34 33 31 31 28 30C30 28 32 26 32 22C32 15 25 8 25 8Z" fill="#C8A96E" opacity="0.8"/>
              <circle cx="25" cy="22" r="3" fill="#7B1113"/>
            </svg>
          </div>
          <div>
            <span class="nav-logo-text">NAVARASA</span>
            <span class="nav-logo-sub">School of Indian Dance</span>
          </div>
        </a>

        <button class="hamburger" id="hamburger" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>

        <ul class="nav-links" id="navLinks">
          <li><a href="#about">About</a></li>
          <li><a href="#dance-forms">Dance Forms</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#navarasa">Navarasa</a></li>
          <li><a href="#schedule">Schedule</a></li>
          <li><a href="#contact" class="nav-cta">Contact</a></li>
        </ul>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero" id="hero">
      <div class="hero-bg"></div>
      <div class="hero-pattern"></div>
      <div class="hero-content">
        <div class="hero-ornament"></div>
        <p class="hero-subtitle">School of Indian Dance</p>
        <h1>NAVA<span>RASA</span></h1>
        <p class="hero-tagline">Nine Emotions. One Art. Infinite Expression.</p>
        <p class="hero-desc">
          Discover the beauty and grace of Indian classical dance in the heart of Switzerland.
          Bharatanatyam, Mohiniyattam, and Bollywood — classes for all ages and all levels.
        </p>
        <div class="hero-buttons">
          <a href="#schedule" class="btn btn-gold">View Classes</a>
          <a href="#contact" class="btn btn-outline">Get in Touch</a>
        </div>
      </div>
      <a href="#about" class="hero-scroll">
        Discover
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </a>
    </section>

    <!-- About -->
    <section class="about" id="about">
      <div class="section-inner">
        <div class="about-grid">
          <div class="about-image fade-in">
            <div class="about-image-frame">
              <div class="about-image-inner">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="35" r="18" stroke="#C8A96E" stroke-width="1.5" opacity="0.5"/>
                  <path d="M60 55C45 55 35 70 35 85L40 90L50 80L55 95L60 75L65 95L70 80L80 90L85 85C85 70 75 55 60 55Z" stroke="#C8A96E" stroke-width="1.5" opacity="0.5"/>
                  <path d="M38 65L20 55M82 65L100 55" stroke="#C8A96E" stroke-width="1.5" opacity="0.4"/>
                </svg>
                <div class="about-image-name">Sumi Ranjith</div>
                <div class="about-image-role">Founder & Artistic Director</div>
              </div>
            </div>
          </div>

          <div class="about-text fade-in">
            <div class="section-label">Our Story</div>
            <h3>Where Tradition Meets Passion</h3>
            <p>
              Founded with a deep passion for preserving and sharing the rich heritage of Indian dance,
              Navarasa School of Indian Dance brings the timeless art forms of India to the heart of Switzerland.
            </p>
            <p>
              Under the guidance of <strong>Sumi Ranjith</strong>, our school welcomes students from all
              walks of life — from curious beginners to dedicated performers. We believe that dance
              transcends boundaries, connecting cultures and communities through the universal language
              of movement and emotion.
            </p>
            <div class="about-quote">
              "Dance is not just an art form; it's a medium through which stories are told,
              emotions are expressed, and cultures are celebrated."
            </div>
            <p>
              At Navarasa, every class is a journey — a blend of rigorous technique, expressive
              storytelling, and the joy of movement. Whether you wish to learn the sacred mudras
              of Bharatanatyam, the graceful swaying of Mohiniyattam, or the vibrant energy of
              Bollywood, you'll find your place here.
            </p>
            <div class="about-stats">
              <div>
                <div class="about-stat-number">3</div>
                <div class="about-stat-label">Dance Forms</div>
              </div>
              <div>
                <div class="about-stat-number">All</div>
                <div class="about-stat-label">Ages Welcome</div>
              </div>
              <div>
                <div class="about-stat-number">CH</div>
                <div class="about-stat-label">Based in Switzerland</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dance Forms -->
    <section class="dance-forms" id="dance-forms">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">What We Teach</div>
          <h2 class="section-title">Our Dance Forms</h2>
          <div class="section-divider"></div>
          <p class="section-subtitle">
            Explore the rich diversity of Indian dance — from ancient temple traditions to contemporary cinema
          </p>
        </div>

        <div class="dance-cards">
          <!-- Bharatanatyam -->
          <div class="dance-card fade-in">
            <div class="dance-card-image bharatanatyam">
              <div class="dance-card-image-content">
                <svg viewBox="0 0 64 64" fill="none" stroke="white" stroke-width="1.5">
                  <circle cx="32" cy="14" r="8"/>
                  <path d="M32 22L32 40M32 30L18 20M32 30L46 20M32 40L22 56M32 40L42 56"/>
                  <path d="M26 56L22 56M42 56L38 56"/>
                </svg>
                <div class="dance-origin">South India</div>
              </div>
            </div>
            <div class="dance-card-body">
              <h3>Bharatanatyam</h3>
              <p>
                One of the oldest classical dance forms, Bharatanatyam is a powerful art of storytelling
                through intricate footwork, expressive hand gestures (mudras), and emotive facial expressions.
                Rooted in the temples of Tamil Nadu, it combines rhythm, melody, and drama into a
                transcendent experience.
              </p>
              <div class="dance-card-tags">
                <span class="dance-tag">Classical</span>
                <span class="dance-tag">Temple Art</span>
                <span class="dance-tag">Nritta &amp; Nritya</span>
              </div>
            </div>
          </div>

          <!-- Mohiniyattam -->
          <div class="dance-card fade-in">
            <div class="dance-card-image mohiniyattam">
              <div class="dance-card-image-content">
                <svg viewBox="0 0 64 64" fill="none" stroke="white" stroke-width="1.5">
                  <circle cx="32" cy="14" r="8"/>
                  <path d="M32 22C32 22 22 30 24 42C25 48 28 54 32 58C36 54 39 48 40 42C42 30 32 22 32 22Z"/>
                  <path d="M24 30L14 26M40 30L50 26"/>
                </svg>
                <div class="dance-origin">Kerala</div>
              </div>
            </div>
            <div class="dance-card-body">
              <h3>Mohiniyattam</h3>
              <p>
                Known as the "Dance of the Enchantress," Mohiniyattam is celebrated for its graceful,
                swaying movements and lyrical beauty. Originating from Kerala, this classical form
                emphasizes delicate footwork, subtle expressions, and flowing white-and-gold costumes
                that mirror the gentle waves of the Arabian Sea.
              </p>
              <div class="dance-card-tags">
                <span class="dance-tag">Classical</span>
                <span class="dance-tag">Lasya Style</span>
                <span class="dance-tag">Graceful</span>
              </div>
            </div>
          </div>

          <!-- Bollywood -->
          <div class="dance-card fade-in">
            <div class="dance-card-image bollywood">
              <div class="dance-card-image-content">
                <svg viewBox="0 0 64 64" fill="none" stroke="white" stroke-width="1.5">
                  <circle cx="32" cy="14" r="8"/>
                  <path d="M32 22L32 38M32 28L20 22M32 28L44 22M32 38L20 52M32 38L44 52"/>
                  <path d="M14 10L18 14L14 18" opacity="0.5"/>
                  <path d="M50 10L46 14L50 18" opacity="0.5"/>
                  <path d="M32 2L34 6L30 6Z" opacity="0.5"/>
                </svg>
                <div class="dance-origin">Bollywood Cinema</div>
              </div>
            </div>
            <div class="dance-card-body">
              <h3>Bollywood Dance</h3>
              <p>
                A vibrant fusion of classical Indian, folk, and contemporary Western styles, Bollywood
                dance brings the energy and glamour of Indian cinema to life. Perfect for all ages
                and fitness levels, these high-energy classes combine catchy choreography with pure joy
                and self-expression.
              </p>
              <div class="dance-card-tags">
                <span class="dance-tag">Fusion</span>
                <span class="dance-tag">High Energy</span>
                <span class="dance-tag">All Levels</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section class="services" id="services">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">Beyond Classes</div>
          <h2 class="section-title">Our Services</h2>
          <div class="section-divider"></div>
          <p class="section-subtitle">
            From stage to celebration, we bring the magic of Indian dance to every occasion
          </p>
        </div>

        <div class="services-grid">
          <div class="service-card fade-in">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 19V6l12-3v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <h3>Event Choreography</h3>
            <p>
              Add cultural flair to your special events with bespoke choreography. Whether it's a wedding,
              corporate function, or cultural festival, we create stunning dance performances tailored
              to your vision.
            </p>
          </div>

          <div class="service-card fade-in">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h3>Dance Workshops</h3>
            <p>
              Intensive workshops for schools, community groups, and corporate team-building events.
              Experience the joy of Indian dance in a fun, engaging, and culturally enriching setting.
            </p>
          </div>

          <div class="service-card fade-in">
            <div class="service-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <h3>Dance Costumes</h3>
            <p>
              Authentic Indian dance costumes available for performances and events. From classical
              Bharatanatyam attire to Bollywood glamour, we help you look the part for every occasion.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Navarasa Meaning -->
    <section class="navarasa-section" id="navarasa">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">The Nine Rasas</div>
          <h2 class="section-title">What is Navarasa?</h2>
          <div class="section-divider"></div>
        </div>

        <div class="navarasa-intro fade-in">
          <p>
            <strong>Navarasa</strong> (Sanskrit: <em>nava</em> = nine, <em>rasa</em> = emotion/essence) refers to the
            nine fundamental emotions in Indian classical arts. These rasas form the emotional core
            of every dance, every story, every performance — representing the full spectrum of the
            human experience.
          </p>
        </div>

        <div class="rasa-grid fade-in">
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Love">&#x2764;&#xFE0F;</span>
            <h4>Love</h4>
            <div class="rasa-sanskrit">Shringara</div>
            <p>Beauty, devotion</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Joy">&#x1F604;</span>
            <h4>Joy</h4>
            <div class="rasa-sanskrit">Hasya</div>
            <p>Laughter, comedy</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Compassion">&#x1F622;</span>
            <h4>Compassion</h4>
            <div class="rasa-sanskrit">Karuna</div>
            <p>Sorrow, empathy</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Fury">&#x1F525;</span>
            <h4>Fury</h4>
            <div class="rasa-sanskrit">Raudra</div>
            <p>Anger, power</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Courage">&#x1F4AA;</span>
            <h4>Courage</h4>
            <div class="rasa-sanskrit">Veera</div>
            <p>Valour, heroism</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Fear">&#x1F628;</span>
            <h4>Fear</h4>
            <div class="rasa-sanskrit">Bhayanaka</div>
            <p>Terror, anxiety</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Disgust">&#x1F922;</span>
            <h4>Disgust</h4>
            <div class="rasa-sanskrit">Bibhatsa</div>
            <p>Aversion, distaste</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Wonder">&#x2728;</span>
            <h4>Wonder</h4>
            <div class="rasa-sanskrit">Adbhuta</div>
            <p>Surprise, awe</p>
          </div>
          <div class="rasa-card">
            <span class="rasa-emoji" role="img" aria-label="Peace">&#x1F54A;&#xFE0F;</span>
            <h4>Peace</h4>
            <div class="rasa-sanskrit">Shanta</div>
            <p>Tranquility, calm</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Schedule -->
    <section class="schedule" id="schedule">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">Join a Class</div>
          <h2 class="section-title">Class Schedule</h2>
          <div class="section-divider"></div>
          <p class="section-subtitle">
            Find the perfect class for your age, level, and interest
          </p>
        </div>

        <div class="schedule-table-wrap fade-in">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Time</th>
                <th>Class</th>
                <th>Level</th>
                <th>Age Group</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Monday</strong></td>
                <td>16:30 - 17:30</td>
                <td>Bharatanatyam</td>
                <td><span class="schedule-level level-beginner">Beginner</span></td>
                <td>Children (6-12)</td>
              </tr>
              <tr>
                <td><strong>Monday</strong></td>
                <td>18:00 - 19:30</td>
                <td>Bharatanatyam</td>
                <td><span class="schedule-level level-intermediate">Intermediate</span></td>
                <td>Teens &amp; Adults</td>
              </tr>
              <tr>
                <td><strong>Wednesday</strong></td>
                <td>17:00 - 18:00</td>
                <td>Bollywood Dance</td>
                <td><span class="schedule-level level-all">All Levels</span></td>
                <td>All Ages</td>
              </tr>
              <tr>
                <td><strong>Thursday</strong></td>
                <td>16:30 - 17:30</td>
                <td>Bharatanatyam</td>
                <td><span class="schedule-level level-beginner">Beginner</span></td>
                <td>Children (6-12)</td>
              </tr>
              <tr>
                <td><strong>Thursday</strong></td>
                <td>18:00 - 19:30</td>
                <td>Mohiniyattam</td>
                <td><span class="schedule-level level-all">All Levels</span></td>
                <td>Teens &amp; Adults</td>
              </tr>
              <tr>
                <td><strong>Saturday</strong></td>
                <td>10:00 - 11:30</td>
                <td>Bharatanatyam</td>
                <td><span class="schedule-level level-advanced">Advanced</span></td>
                <td>Adults</td>
              </tr>
              <tr>
                <td><strong>Saturday</strong></td>
                <td>12:00 - 13:00</td>
                <td>Bollywood Dance</td>
                <td><span class="schedule-level level-all">All Levels</span></td>
                <td>All Ages</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="schedule-note fade-in">
          Schedule may vary during school holidays. <a href="#contact">Contact us</a> for the latest information
          or to book a trial class.
        </p>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="testimonials" id="testimonials">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">What People Say</div>
          <h2 class="section-title">Testimonials</h2>
          <div class="section-divider"></div>
        </div>

        <div class="testimonials-grid">
          <div class="testimonial-card fade-in">
            <p class="testimonial-text">
              My daughter has been learning Bharatanatyam with Sumi for two years now. The transformation
              in her confidence and grace is remarkable. Sumi's patience and dedication make every
              class a joy.
            </p>
            <div class="testimonial-author">Priya M.</div>
            <div class="testimonial-role">Parent, Zurich</div>
          </div>

          <div class="testimonial-card fade-in">
            <p class="testimonial-text">
              I joined the Bollywood class as a complete beginner with no dance background. Sumi made
              me feel so welcome, and now I look forward to every Wednesday! It's the highlight
              of my week.
            </p>
            <div class="testimonial-author">Laura S.</div>
            <div class="testimonial-role">Student, Bern</div>
          </div>

          <div class="testimonial-card fade-in">
            <p class="testimonial-text">
              Sumi choreographed a beautiful Bharatanatyam performance for our cultural event.
              The audience was mesmerized. Her professionalism and artistry are truly outstanding.
            </p>
            <div class="testimonial-author">Raj K.</div>
            <div class="testimonial-role">Event Organiser</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section class="contact" id="contact">
      <div class="section-inner">
        <div class="section-header fade-in">
          <div class="section-label">Get in Touch</div>
          <h2 class="section-title">Contact Us</h2>
          <div class="section-divider"></div>
        </div>

        <div class="contact-grid">
          <div class="contact-info fade-in">
            <h3>Let's Start Your Dance Journey</h3>
            <p>
              Whether you're curious about classes, want to book a trial, or need choreography
              for an event — we'd love to hear from you.
            </p>

            <div class="contact-detail">
              <div class="contact-detail-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div class="contact-detail-text">
                <strong>Email</strong>
                <a href="mailto:info@navarasa.ch">info@navarasa.ch</a>
              </div>
            </div>

            <div class="contact-detail">
              <div class="contact-detail-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="contact-detail-text">
                <strong>Location</strong>
                <span>Switzerland</span>
              </div>
            </div>

            <div class="contact-detail">
              <div class="contact-detail-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="contact-detail-text">
                <strong>Classes</strong>
                <span>Online &amp; In-Person Available</span>
              </div>
            </div>

            <div class="social-links">
              <a href="https://www.instagram.com/navarasa_swiss/" target="_blank" rel="noopener" class="social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://navarasa.ch" target="_blank" rel="noopener" class="social-link" aria-label="Website">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              </a>
            </div>
          </div>

          <div class="fade-in">
            <form class="contact-form" id="contactForm">
              <div class="form-row">
                <div class="form-group">
                  <label for="fname">First Name</label>
                  <input type="text" id="fname" name="firstName" required placeholder="Your first name">
                </div>
                <div class="form-group">
                  <label for="lname">Last Name</label>
                  <input type="text" id="lname" name="lastName" required placeholder="Your last name">
                </div>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required placeholder="you@example.com">
              </div>
              <div class="form-group">
                <label for="interest">I'm Interested In</label>
                <select id="interest" name="interest">
                  <option value="">Select an option...</option>
                  <option value="bharatanatyam">Bharatanatyam Classes</option>
                  <option value="mohiniyattam">Mohiniyattam Classes</option>
                  <option value="bollywood">Bollywood Dance Classes</option>
                  <option value="choreography">Event Choreography</option>
                  <option value="workshop">Workshop Booking</option>
                  <option value="costumes">Dance Costumes</option>
                  <option value="trial">Trial Class</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" placeholder="Tell us about yourself or your enquiry..."></textarea>
              </div>
              <button type="submit" class="btn-submit">Send Message</button>
            </form>
            <div class="form-success" id="formSuccess">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h3>Thank You!</h3>
              <p>We've received your message and will get back to you soon.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand">
            <a href="#" class="nav-logo">
              <div class="nav-logo-icon">
                <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="25" cy="25" r="24" stroke="#C8A96E" stroke-width="1.5"/>
                  <path d="M25 8C25 8 18 15 18 22C18 26 20 28 22 30C19 31 16 33 16 37C16 41 20 44 25 44C30 44 34 41 34 37C34 33 31 31 28 30C30 28 32 26 32 22C32 15 25 8 25 8Z" fill="#C8A96E" opacity="0.8"/>
                  <circle cx="25" cy="22" r="3" fill="#7B1113"/>
                </svg>
              </div>
              <div>
                <span class="nav-logo-text">NAVARASA</span>
                <span class="nav-logo-sub">School of Indian Dance</span>
              </div>
            </a>
            <p>Bringing the timeless beauty of Indian classical dance to Switzerland. Classes, workshops, and performances for all.</p>
          </div>

          <div class="footer-col">
            <h4>Dance Forms</h4>
            <ul>
              <li><a href="#dance-forms">Bharatanatyam</a></li>
              <li><a href="#dance-forms">Mohiniyattam</a></li>
              <li><a href="#dance-forms">Bollywood Dance</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Services</h4>
            <ul>
              <li><a href="#services">Event Choreography</a></li>
              <li><a href="#services">Workshops</a></li>
              <li><a href="#services">Dance Costumes</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="https://www.instagram.com/navarasa_swiss/" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="#schedule">Class Schedule</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; 2025 Navarasa - School of Indian Dance. All rights reserved.</span>
          <span>Crafted with love in Switzerland</span>
        </div>
      </div>
    </footer>

    <script>
      // ===== Navigation scroll effect =====
      const navbar = document.getElementById('navbar');
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
      });

      // ===== Hamburger menu =====
      const hamburger = document.getElementById('hamburger');
      const navLinks = document.getElementById('navLinks');

      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
      });

      // Close menu on link click
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navLinks.classList.remove('open');
        });
      });

      // ===== Smooth scroll for anchor links =====
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            const offset = 80;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        });
      });

      // ===== Fade-in animation on scroll =====
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);

      document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

      // ===== Contact form =====
      const contactForm = document.getElementById('contactForm');
      const formSuccess = document.getElementById('formSuccess');

      contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // In production, this would send data to an API
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      });
    </script>
</body>
</html>`)
})

export default app
