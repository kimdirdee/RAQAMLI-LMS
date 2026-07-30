// Hamburger menu
function toggleMenu() {
    document.getElementById('mobileNav').classList.toggle('open');
}
function closeMenu() {
    document.getElementById('mobileNav').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '1rem 5%';
            navbar.classList.add('scrolled');
            navbar.style.background = '';
        } else {
            navbar.style.padding = '1.5rem 5%';
            navbar.classList.remove('scrolled');
            navbar.style.background = '';
        }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    });

    // Typewriter effect
    const text1 = "Kelajak Kasbini ";
    const text2 = "Biz Bilan O'rganing";
    const el1 = document.getElementById('typewriter-line1');
    const el2 = document.getElementById('typewriter-line2');
    const cursor = document.getElementById('cursor');
    
    let i = 0, j = 0;
    
    function typeText1() {
        if (i === 0 && cursor && el1) {
            el1.parentNode.insertBefore(cursor, el1.nextSibling); // place cursor after line1
        }
        if (i < text1.length) {
            el1.innerHTML += text1.charAt(i);
            i++;
            setTimeout(typeText1, 50);
        } else {
            setTimeout(typeText2, 200);
        }
    }

    function typeText2() {
        if (j === 0 && cursor && el2) {
            el2.parentNode.appendChild(cursor); // move cursor to end of h1
        }
        if (j < text2.length) {
            el2.innerHTML += text2.charAt(j);
            j++;
            setTimeout(typeText2, 50);
        }
    }
    
    if(el1 && el2) {
        setTimeout(typeText1, 500);
    }
});
