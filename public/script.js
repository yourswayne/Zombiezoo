document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameOverDiv = document.getElementById('gameOver');
    const overlayDiv = document.querySelector('.overlay');
    const retryButton = document.getElementById('retryButton');
    const nextButton = document.getElementById('nextButton');
    const zombieCounter = document.getElementById('zombieCounter');
    const zombieCountSpan = document.getElementById('zombieCount');
    const fastZombieCountSpan = document.getElementById('fastZombieCount');
    const slowZombieCountSpan = document.getElementById('slowZombieCount');

    const moneyCountSpan = document.getElementById('moneyCount');
    const gameOverText = document.getElementById('gameOverText');
    const pauseMenu = document.getElementById('pauseMenu');
    const continueButton = document.getElementById('continueButton');
    const retryButtonPause = document.getElementById('retryButtonPause');
    const resetButton = document.getElementById('resetButton');
    const shopMenu = document.getElementById('shopMenu');
    const increaseRateButton = document.getElementById('increaseRate');
    const increaseDamageButton = document.getElementById('increaseDamage');
    const increaseBulletSpeedButton = document.getElementById('increaseBulletSpeed');
    const enableKnockbackButton = document.getElementById('enableKnockbackButton');
    const closeShopButton = document.getElementById('closeShop');
    const shopMessage = document.getElementById('shopMessage');
    const rateLevelDisplay = document.getElementById('rateLevel');
    const damageLevelDisplay = document.getElementById('damageLevel');
    const speedLevelDisplay = document.getElementById('speedLevel');
    const knockbackLevelDisplay = document.getElementById('knockbackLevel');

    let isPaused = false;
    let inShop = false;
    let shotCooldown = 750;
    let bulletDamage = 5;
    let bulletSpeed = 11;
    let knockbackDistance = 0;
    let upgradeLevels = { rate: 1, damage: 1, speed: 1, knockback: 0 };
    let upgradePrices = { rate: 50, damage: 100, speed: 50, knockback: 75 };

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const playerImage = new Image();
    playerImage.src = 'images/player.png';

    const bulletImage = new Image();
    bulletImage.src = 'images/bullets.png';

    const zombieImage = new Image();
    zombieImage.src = 'images/zombie.png';

    const fastZombieImage = new Image();
    fastZombieImage.src = 'images/zombie-y.png';

    const slowZombieImage = new Image();
    slowZombieImage.src = 'images/zombie-o.png';



    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 143,
        height: 90,
        speed: 5,
        angle: 0,
        health: 100
    };

    const bullets = [];
    const zombies = [];
    const keys = {};
    let lastShotTime = 0;
    const damageInterval = 1000;
    let lastDamageTime = 0;
    let gameRunning = true;

    let currentLevel = 1;


    let zombieBaseHealth; //WICHTIG
    let zombieBaseDamage;
    let fastZombieBaseHealth;
    let fastZombieBaseDamage;
    let slowZombieBaseHealth;
    let slowZombieBaseDamage

    let normalSpawnInterval;
    let fastSpawnInterval;
    let slowSpawnInterval

    let totalZombies;
    let totalFastZombies;
    let totalSlowZombies;
    let remainingZombies;
    let remainingFastZombies;
    let remainingSlowZombies;
    let spawnedZombies = 0;
    let spawnInterval;


    let shootInterval;
    let totalMoney = 100;
    let roundMoney = 0;


    if (localStorage.getItem('totalMoney')) {
        totalMoney = parseInt(localStorage.getItem('totalMoney'));
    }

    moneyCountSpan.innerText = `$${totalMoney}`;

    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore();
    }

    function drawBullet(bullet) {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    }

    function shootBullet() {
        const now = Date.now();
        if (now - lastShotTime > shotCooldown) {
            const bullet = {
                x: player.x + Math.cos(player.angle) * (player.width / 2),
                y: player.y + Math.sin(player.angle) * (player.width / 2),
                width: 10,
                height: 10,
                speed: bulletSpeed,
                angle: player.angle,
                damage: bulletDamage
            };
            bullets.push(bullet);
            lastShotTime = now;
        }
    }

    function drawZombie(zombie) {
        ctx.save();
        ctx.translate(zombie.x, zombie.y);
        ctx.rotate(zombie.angle);
        if (zombie.hit) {
            ctx.globalAlpha = 0.5;
        }
        if (zombie.type === 'fast') {
            ctx.drawImage(fastZombieImage, -zombie.width / 2, -zombie.height / 2, zombie.width, zombie.height);
        } else if (zombie.type === 'slow') {
            ctx.drawImage(slowZombieImage, -zombie.width / 2, -zombie.height / 2, zombie.width, zombie.height);
        } else {
            ctx.drawImage(zombieImage, -zombie.width / 2, -zombie.height / 2, zombie.width, zombie.height);
        }
    
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    function spawnZombie(type) {
        if (spawnedZombies >= totalZombies + totalFastZombies + totalSlowZombies|| isPaused || inShop) return;

        const edge = Math.floor(Math.random() * 4);
        let x, y;

        switch (edge) {
            case 0: x = Math.random() * canvas.width; y = -50; break;
            case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
            case 3: x = -50; y = Math.random() * canvas.height; break;
        }

        const zombie = {
            x: x,
            y: y,
            width: 120,
            height: 90,
            speed: type === 'fast' ? 4 : (type === 'slow' ? 1 : 2),
            angle: 0,
            lives: type === 'fast' ? fastZombieBaseHealth : (type === 'slow' ? slowZombieBaseHealth : zombieBaseHealth),
            type: type,
            damage: type === 'fast' ? fastZombieBaseDamage : (type === 'slow' ? slowZombieBaseDamage : zombieBaseDamage),
            hit: false,
            lastDamageTime: 0 // Neue Eigenschaft
        };
        zombies.push(zombie);
        spawnedZombies++;
    }

    const damageIndicators = [];

// Funktion zum Hinzufügen eines Schadensindikators
function addDamageIndicator(x, y, damage) {
    damageIndicators.push({
        x: x,
        y: y,
        damage: damage,
        opacity: 1, // Anfangs volle Sichtbarkeit
        lifespan: 100 // Frames, die der Indikator sichtbar bleibt
    });
}

function drawDamageIndicators() {
    damageIndicators.forEach((indicator, index) => {
        ctx.save();
        ctx.globalAlpha = indicator.opacity; // Setzt die Transparenz basierend auf der verbleibenden Lebensdauer
        ctx.font = '20px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText(`-${indicator.damage}`, indicator.x, indicator.y);
        ctx.restore();

        // Aktualisiert die Position und Sichtbarkeit
        indicator.y -= 1; // Bewegt den Indikator nach oben
        indicator.opacity -= 0.03; // Reduziert die Sichtbarkeit
        indicator.lifespan--;

        // Entfernt den Indikator, wenn er abgelaufen ist
        if (indicator.lifespan <= 0) {
            damageIndicators.splice(index, 1);
        }
    });
}

function zombieDefeated(zombie) {
    // Explosionen-Container abrufen
    const explosionContainer = document.getElementById('explosionContainer');
    
    // Neues Explosionselement erstellen
    const explosion = document.createElement('div');
    explosion.classList.add('explosion');
    explosion.style.left = `${zombie.x - 50}px`; // Zentriere die Explosion auf den Zombie
    explosion.style.top = `${zombie.y - 50}px`; // Zentriere die Explosion auf den Zombie
    explosion.style.backgroundImage = 'url("/images/3klP.gif")'; // Link zum GIF

    // Explosion dem Container hinzufügen
    explosionContainer.appendChild(explosion);

    // Explosion nach dem Abspielen entfernen (1 Sekunde Dauer als Beispiel)
    setTimeout(() => {
        explosionContainer.removeChild(explosion);
    }, 700); // Dauer des GIFs in Millisekunden
}

    

function updateZombies() {
    zombies.forEach((zombie, index) => {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        zombie.angle = Math.atan2(dy, dx);
        zombie.x += Math.cos(zombie.angle) * zombie.speed;
        zombie.y += Math.sin(zombie.angle) * zombie.speed;

        bullets.forEach((bullet, bulletIndex) => {
            const dist = Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y);
            if (dist < zombie.width / 2 + bullet.width / 2) {
                zombie.lives -= bullet.damage;
                zombie.hit = true;
                
                // Schadensindikator hinzufügen
                addDamageIndicator(zombie.x, zombie.y, bullet.damage);

                if (knockbackDistance > 0) {
                    zombie.x -= knockbackDistance * Math.cos(zombie.angle);
                    zombie.y -= knockbackDistance * Math.sin(zombie.angle);
                }
                setTimeout(() => zombie.hit = false, 100);
                bullets.splice(bulletIndex, 1);

                if (zombie.lives <= 0) {
                    zombieDefeated(zombie); // Explosion anzeigen
                    zombies.splice(index, 1);

                    if (zombie.type === 'fast') {
                        remainingFastZombies--;
                        fastZombieCountSpan.innerText = remainingFastZombies;
                    } else {
                        remainingZombies--;
                        zombieCountSpan.innerText = remainingZombies;
                    }

                    const earnedMoney = Math.floor(Math.random() * 6) + 5;
                    roundMoney += earnedMoney;
                    totalMoney += earnedMoney;
                    updateMoneyDisplay();

                    if (remainingZombies === 0 && remainingFastZombies === 0 && spawnedZombies >= totalZombies + totalFastZombies) {
                        gameWon();
                    }
                }
            }
        });

        const now = Date.now();
        const playerDist = Math.hypot(player.x - zombie.x, player.y - zombie.y);
        if (playerDist < player.width / 2 + zombie.width / 2) {
            if (!zombie.lastDamageTime || now - zombie.lastDamageTime > damageInterval) {
                player.health -= zombie.damage; // Nimm den Schaden des spezifischen Zombies
                zombie.lastDamageTime = now; // Speichere den letzten Schaden-Zeitstempel pro Zombie
                if (player.health <= 0) {
                    gameOver();
                }
            }
        }
    });
}
    function updateBullets() {
        bullets.forEach((bullet, index) => {
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(index, 1);
            }
        });
    }

    function updatePlayer() {
        if (keys['w'] || keys['ArrowUp']) player.y -= player.speed;
        if (keys['s'] || keys['ArrowDown']) player.y += player.speed;
        if (keys['a'] || keys['ArrowLeft']) player.x -= player.speed;
        if (keys['d'] || keys['ArrowRight']) player.x += player.speed;
        if (player.x < player.width / 2) player.x = player.width / 2;
        if (player.x > canvas.width - player.width / 2) player.x = canvas.width - player.width / 2;
        if (player.y < player.height / 2) player.y = player.height / 2;
        if (player.y > canvas.height - player.height / 2) player.y = canvas.height - player.height / 2;
    }

    function drawHealthBar() {
        const healthBarWidth = 200;
        const healthBarHeight = 20;
        const x = 20;
        const y = canvas.height - healthBarHeight - 20;
        ctx.fillStyle = 'red';
        ctx.fillRect(x, y, healthBarWidth, healthBarHeight);
        const currentHealthWidth = (player.health / 100) * healthBarWidth;
        ctx.fillStyle = 'green';
        ctx.fillRect(x, y, currentHealthWidth, healthBarHeight);
    }

    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            pauseMenu.style.display = 'flex';
            overlayDiv.style.display = 'block';
            clearInterval(spawnInterval);
        } else {
            pauseMenu.style.display = 'none';
            overlayDiv.style.display = 'none';
            setLevelDetails();
            update();
        }
    }

    function toggleShop() {
        inShop = !inShop;
        if (inShop) {
            shopMenu.style.display = 'flex';
            overlayDiv.style.display = 'block';
            clearInterval(spawnInterval);
        } else {
            shopMenu.style.display = 'none';
            overlayDiv.style.display = 'none';
            setLevelDetails();
            update();
        }
    }

    function gameOver() {
        gameRunning = false;
        gameOverText.innerText = 'Game Over';
        overlayDiv.style.display = 'block';
        gameOverDiv.style.display = 'flex';
        clearInterval(spawnInterval);
        clearInterval(shootInterval);
        roundMoney = 0;
        updateMoneyDisplay();
    }

    function gameWon() {
        gameRunning = false;
        // Überprüfen, ob es die zweite Welle ist
        if (currentLevel === 5) {
            gameOverText.innerText = 'Game won!';
        } else {
            gameOverText.innerText = 'Wave complete!';
        }
        
        overlayDiv.style.display = 'block';
        gameOverDiv.style.display = 'flex';
        clearInterval(spawnInterval);
        clearInterval(shootInterval);
    
        // Wenn Level 2 erreicht ist, setze das Geld auf 0
        if (currentLevel === 2) {
            totalMoney == 0;
            localStorage.setItem('totalMoney', totalMoney);
        } else {
            nextButton.style.display = 'inline-block';
            totalMoney += roundMoney;
            localStorage.setItem('totalMoney', totalMoney);
        }
    
        // Setze das Geld für die nächste Runde
        roundMoney = 10000;
        updateMoneyDisplay();
    }
    

    function resetGame() {
        gameRunning = true;
        isPaused = false;
        inShop = false;
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.health = 100;
        bullets.length = 0;
        zombies.length = 0;
        remainingZombies = totalZombies;
        remainingFastZombies = totalFastZombies;
        remainingSlowZombies = totalSlowZombies;
        spawnedZombies = 0;
        moneyCountSpan.innerText = `$${totalMoney}`;
        zombieCountSpan.innerText = remainingZombies;
        fastZombieCountSpan.innerText = remainingFastZombies;
        slowZombieCountSpan.innerText = remainingSlowZombies;
        overlayDiv.style.display = 'none';
        gameOverDiv.style.display = 'none';
        pauseMenu.style.display = 'none';
        shopMenu.style.display = 'none';
        zombieCounter.style.display = 'block';
        setLevelDetails();
        update();
    }

    function resetAll() {
        currentLevel = 1;
        totalMoney = 0;
        localStorage.setItem('totalMoney', totalMoney);
        startLevel();
    }

    function nextLevel() {
        currentLevel++;
        startLevel();
    }

    function startLevel() {
        const levelText = `Level ${currentLevel}`;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(levelText, canvas.width / 2, canvas.height / 2);
        gameOverDiv.style.display = 'none';
        overlayDiv.style.display = 'none';
        pauseMenu.style.display = 'none';
        shopMenu.style.display = 'none';
        zombieCounter.style.display = 'none';
        setTimeout(() => {
            setLevelDetails();
            resetGame();
        }, 2000);
    }

    function setLevelDetails() {
        // Basiswerte
        const baseZombieHealth = 10; 
        const baseZombieDamage = 10;
        const baseZombieSpeed = 2;
    
        const baseFastZombieHealth = 5;
        const baseFastZombieDamage = 15;
        const baseFastZombieSpeed = 4;

        const baseSlowZombieHealth = 20;
        const baseSlowZombieDamage = 30;
    
        // Wachstumslogik
        zombieBaseHealth = baseZombieHealth + currentLevel * 10; // Zunehmende Gesundheit
        zombieBaseDamage = baseZombieDamage + currentLevel; // Zunehmender Schaden

        fastZombieBaseHealth = baseFastZombieHealth + currentLevel * 8; 
        fastZombieBaseDamage = baseFastZombieDamage + currentLevel;

        slowZombieBaseHealth = baseSlowZombieHealth + currentLevel * 4;
        slowZombieBaseDamage = baseSlowZombieDamage + currentLevel;
    
        totalZombies = 5 + growthFactor * 3; // Erhöht die Anzahl normaler Zombies
        totalFastZombies = 4+ growthFactor >= 1 ? growthFactor * 4 : 0; // Fügt schnelle Zombies ab Level 3 hinzu
        totalSlowZombies = growthFactor >= 2 ? growthFactor * 3 : 0;
    
        setZombieSpawnInterval(
            Math.max(3000 - currentLevel * 200, 1000), // Schnelleres Spawnen
            Math.max(7000 - currentLevel * 300, 3000), 
            Math.max(2000 - currentLevel * 150, 800), 
            Math.max(5000 - currentLevel * 300, 2000)
        );
    
        remainingZombies = totalZombies;
        remainingFastZombies = totalFastZombies;
        remainingSlowZombies = totalSlowZombies;
    }
    

    function setZombieSpawnInterval(normalMin, normalMax, fastMin = normalMin, fastMax = normalMax, slowMin = normalMin, slowMax = normalMax) {
        // Lösche vorherige Intervalle, wenn sie existieren
        clearInterval(normalSpawnInterval);
        clearInterval(fastSpawnInterval);
        clearInterval(slowSpawnInterval);
    
        // Normale Zombies spawnen
        let normalSpawned = 0;
        normalSpawnInterval = setInterval(() => {
            if (normalSpawned < totalZombies && !isPaused && !inShop) {
                spawnZombie('normal', Math.random() * (normalMax - normalMin) + normalMin);
                normalSpawned++;
            } else {
                clearInterval(normalSpawnInterval); // Stoppe, wenn alle normalen Zombies gespawnt sind
            }
        }, Math.random() * (normalMax - normalMin) + normalMin);
    
        // Schnelle Zombies spawnen
        let fastSpawned = 0;
        fastSpawnInterval = setInterval(() => {
            if (fastSpawned < totalFastZombies && !isPaused && !inShop) {
                spawnZombie('fast', Math.random() * (fastMax - fastMin) + fastMin);
                fastSpawned++;
            } else {
                clearInterval(fastSpawnInterval); // Stoppe, wenn alle schnellen Zombies gespawnt sind
            }
        }, Math.random() * (fastMax - fastMin) + fastMin);
    
        // Langsame Zombies spawnen
        let slowSpawned = 0;
        slowSpawnInterval = setInterval(() => {
            if (slowSpawned < totalSlowZombies && !isPaused && !inShop) {
                spawnZombie('slow', Math.random() * (slowMax - slowMin) + slowMin);
                slowSpawned++;
            } else {
                clearInterval(slowSpawnInterval); // Stoppe, wenn alle langsamen Zombies gespawnt sind
            }
        }, Math.random() * (slowMax - slowMin) + slowMin);
    }
    
    

    function update() {
        if (!gameRunning || isPaused || inShop) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updatePlayer();
        drawPlayer();
        updateBullets();
        bullets.forEach(drawBullet);
        updateZombies();
        zombies.forEach(drawZombie);
        drawDamageIndicators(); // Zeichnet Schadensindikatoren
        drawHealthBar();
        requestAnimationFrame(update);
    }

    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'Escape') {
            togglePause();
        } else if (e.key === 'e' || e.key === 'E') {
            toggleShop();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    });

    canvas.addEventListener('mousedown', () => {
        shootBullet();
        shootInterval = setInterval(shootBullet, shotCooldown);
    });

    canvas.addEventListener('mouseup', () => {
        clearInterval(shootInterval);
    });

    retryButton.addEventListener('click', resetGame);
    continueButton.addEventListener('click', togglePause);
    retryButtonPause.addEventListener('click', resetGame);
    resetButton.addEventListener('click', resetAll);
    nextButton.addEventListener('click', nextLevel);

    increaseRateButton.addEventListener('click', () => {
        if (totalMoney >= upgradePrices.rate) {
            totalMoney -= upgradePrices.rate;
            shotCooldown = Math.max(100, shotCooldown - 50);
            upgradeLevels.rate++;
            upgradePrices.rate += 25;
            updateShopDisplays();
            updateMoneyDisplay();
            updateUpgradeDisplays()
        } else {
            shopMessage.innerText = 'Nicht genug Geld';
        }
    });
    //nogaboga
    increaseDamageButton.addEventListener('click', () => {
        if (totalMoney >= upgradePrices.damage) {
            totalMoney -= upgradePrices.damage;
            bulletDamage++;
            upgradeLevels.damage++;
            upgradePrices.damage += 50;
            updateShopDisplays();
            updateMoneyDisplay();
            updateUpgradeDisplays()
        } else {
            shopMessage.innerText = 'Nicht genug Geld';
        }
    });

    increaseBulletSpeedButton.addEventListener('click', () => {
        if (totalMoney >= upgradePrices.speed) {
            totalMoney -= upgradePrices.speed;
            bulletSpeed++;
            upgradeLevels.speed++;
            upgradePrices.speed += 25;
            updateShopDisplays();
            updateMoneyDisplay();
            updateUpgradeDisplays()
        } else {
            shopMessage.innerText = 'Nicht genug Geld';
        }
    });

    enableKnockbackButton.addEventListener('click', () => {
        if (totalMoney >= upgradePrices.knockback) {
            totalMoney -= upgradePrices.knockback;
            knockbackDistance += 50;
            upgradeLevels.knockback++;
            upgradePrices.knockback += 25;
            updateShopDisplays();
            updateMoneyDisplay();
            updateUpgradeDisplays()
        } else {
            shopMessage.innerText = 'Nicht genug Geld';
        }
    });

    closeShopButton.addEventListener('click', () => {
        shopMessage.innerText = '';
        toggleShop();
    });


    function updateMoneyDisplay() {
        moneyCountSpan.innerText = `$${totalMoney}`;
    }

    function updateUpgradeDisplays() {
        rateLevelDisplay.innerText = `Level: ${upgradeLevels.rate}`;
        damageLevelDisplay.innerText = `Level: ${upgradeLevels.damage}`;
        speedLevelDisplay.innerText = `Level: ${upgradeLevels.speed}`;
        knockbackLevelDisplay.innerText = `Level: ${upgradeLevels.knockback}`;
    }

    function updateShopDisplays() {
        increaseRateButton.innerText = `Feuerrate erhöhen - $${upgradePrices.rate}`;
        increaseDamageButton.innerText = `Kugelschaden erhöhen - $${upgradePrices.damage}`;
        increaseBulletSpeedButton.innerText = `Kugelgeschwindigkeit erhöhen - $${upgradePrices.speed}`;
        enableKnockbackButton.innerText = `Rückstoß aktivieren - $${upgradePrices.knockback}`;
    }

    function updateCurrentLevelDisplay() {
        const levelDisplay = document.getElementById("currentLevelDisplay"); // Stelle sicher, dass dieses Element existiert!
        if (levelDisplay) {
            levelDisplay.innerText = `Level: ${currentLevel}`;
        } else {
            console.warn("⚠️ Element für die Level-Anzeige nicht gefunden!");
        }
    }
    

    async function saveGameStats() {
        const username = sessionStorage.getItem("username");
        if (!username) {
            alert("Fehler: Kein Benutzername gespeichert! Bitte erneut anmelden.");
            return;
        }
    
        const gameStats = {
            wave: currentLevel,
            money: totalMoney,
            upgrades: {
                rate: upgradeLevels.rate,
                damage: upgradeLevels.damage,
                speed: upgradeLevels.speed,
                knockback: upgradeLevels.knockback
            }
        };
    
        try {
            const response = await fetch("http://localhost:5000/api/stats", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username: username, stats: gameStats })
            });
    
            const data = await response.json();
            if (data.success) {
                alert("Spielstand erfolgreich gespeichert!");
            } else {
                alert("Fehler beim Speichern: " + data.message);
            }
        } catch (error) {
            console.error("Fehler:", error);
            alert("Speicherung fehlgeschlagen!");
        }
    }
    
    const loadGameStats = async () => {
        const username = sessionStorage.getItem("username");
        if (!username) {
            console.error("❌ Kein Benutzername gespeichert. Bitte anmelden.");
            return;
        }
    
        try {
            const response = await fetch(`/api/stats?username=${username}`);
            const text = await response.text();
            console.log("📌 Rohe Server Antwort:", text);
    
            const result = JSON.parse(text);
    
            if (!result.success) {
                console.error("❌ Fehler beim Laden des Spielstands:", result.message);
                return;
            }
    
            const stats = result.stats;
    
            console.log("✅ GELADENE SPIELWERTE:", stats);
    
            // 🟢 Speichern der geladenen Werte
            totalMoney = stats.money;
            currentLevel = stats.wave;
            upgradeLevels.rate = stats.upgrades.rate;
            upgradeLevels.damage = stats.upgrades.damage;
            upgradeLevels.speed = stats.upgrades.speed;
            upgradeLevels.knockback = stats.upgrades.knockback;
    
            shotCooldown = stats.shotCooldown ?? shotCooldown;
            bulletDamage = stats.bulletDamage ?? bulletDamage;
            bulletSpeed = stats.bulletSpeed ?? bulletSpeed;
            knockbackDistance = stats.knockbackDistance ?? knockbackDistance;
    
            console.log("✅ SPIELSTAND ÜBERNOMMEN:");
            console.log("💰 Geld:", totalMoney);
            console.log("🌊 Level:", currentLevel);
            console.log("🛠️ Upgrades:", upgradeLevels);
            console.log("🔫 Waffenwerte:", { shotCooldown, bulletDamage, bulletSpeed, knockbackDistance });
    
            updateMoneyDisplay();      // Aktualisiert das Geld in der UI
            updateUpgradeDisplays();
            updateCurrentLevelDisplay();  
            nextLevel();    

            console.log("✅ UI erfolgreich aktualisiert.");

            updateGameState();
    
        } catch (err) {
            console.error("❌ Netzwerk- oder JSON-Fehler beim Laden des Spielstands:", err);
        }
    };
    
    
    const updateGameState = () => {
    console.log("🔄 SPIELWERTE IN SPIELMECHANIK ÜBERTRAGEN...");

    // Falls das Spiel eine Funktion hat, um das Level zu setzen
    if (typeof setWave === "function") {
        setWave(currentLevel);
    } else {
        console.warn("⚠️ Funktion 'setWave()' nicht gefunden!");
    }

    // Falls eine Upgrade-Funktion existiert
    if (typeof applyUpgrades === "function") {
        applyUpgrades(upgradeLevels);
    } else {
        console.warn("⚠️ Funktion 'applyUpgrades()' nicht gefunden!");
    }

    // Falls eine Waffen-Update-Funktion existiert
    if (typeof updateWeaponStats === "function") {
        updateWeaponStats(shotCooldown, bulletDamage, bulletSpeed, knockbackDistance);
    } else {
        console.warn("⚠️ Funktion 'updateWeaponStats()' nicht gefunden!");
    }

    console.log("✅ SPIELMECHANIK AKTUALISIERT MIT:", {
        wave: currentLevel,
        upgrades: upgradeLevels,
        shotCooldown,
        bulletDamage,
        bulletSpeed,
        knockbackDistance
    });
};



    // Lade Spielstand, wenn das Spiel gestartet wird
    window.addEventListener("load", loadGameStats);
    
    
    
document.getElementById("saveStatsButton").addEventListener("click", async () => {
    const username = sessionStorage.getItem("username");
    if (!username) {
        alert("Fehler: Kein Benutzername gefunden. Bitte neu anmelden.");
        return;
    }

    const gameStats = {
        wave: currentLevel,
        money: totalMoney,
        upgrades: {
            rate: upgradeLevels.rate,
            damage: upgradeLevels.damage,
            speed: upgradeLevels.speed,
            knockback: upgradeLevels.knockback
        },
        shotCooldown: shotCooldown,
        bulletDamage: bulletDamage,
        bulletSpeed: bulletSpeed,
        knockbackDistance: knockbackDistance
    };

    try {
        const response = await fetch("/api/stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, stats: gameStats })
        });

        const data = await response.json();
        if (data.success) {
            alert("Spielstand erfolgreich gespeichert!");
        } else {
            alert("Fehler beim Speichern: " + data.message);
        }
    } catch (error) {
        console.error("❌ Fehler beim Speichern:", error);
        alert("Speicherung fehlgeschlagen!");
    }
});

    

    

    startLevel();
});