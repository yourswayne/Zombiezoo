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
    let shotCooldown = 250;
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
    const damagePerHit = 5;
    const damageInterval = 1000;
    let lastDamageTime = 0;
    let gameRunning = true;

    let currentLevel = 1;


    let zombieBaseHealth; //WICHTIG
    let zombieBaseDamage;
    let fastZombieBaseHealth;
    let fastZombieBaseDamage;

    let totalZombies;
    let totalFastZombies;
    let remainingZombies;
    let remainingFastZombies;
    let spawnedZombies = 0;
    let spawnInterval;


    let shootInterval;
    let totalMoney = 0;
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
        ctx.drawImage(zombie.type === 'fast' ? fastZombieImage : zombieImage, -zombie.width / 2, -zombie.height / 2, zombie.width, zombie.height);
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    function spawnZombie(type) {
        if (spawnedZombies >= totalZombies + totalFastZombies || isPaused || inShop) return;

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
            speed: type === 'fast' ? 4 : 2,
            angle: 0,
            lives: type === 'fast' ? fastZombieBaseHealth : zombieBaseHealth, // Unterscheidet zwischen normal und fast
            type: type,
            damage: type === 'fast' ? fastZombieBaseDamage : zombieBaseDamage, // Unterscheidet zwischen normal und fast
            hit: false
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
        lifespan: 30 // Frames, die der Indikator sichtbar bleibt
    });
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
                    if (knockbackDistance > 0) {
                        zombie.x -= knockbackDistance * Math.cos(zombie.angle);
                        zombie.y -= knockbackDistance * Math.sin(zombie.angle);
                    }
                    setTimeout(() => zombie.hit = false, 100);
                    bullets.splice(bulletIndex, 1);
                    if (zombie.lives <= 0) {
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
                if (now - lastDamageTime > damageInterval) {
                    player.health -= damagePerHit;
                    lastDamageTime = now;
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
            startZombieSpawning();
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
            startZombieSpawning();
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
        gameOverText.innerText = 'You Won!';
        overlayDiv.style.display = 'block';
        gameOverDiv.style.display = 'flex';
        clearInterval(spawnInterval);
        clearInterval(shootInterval);
        if (currentLevel === 100000) {
            nextButton.style.display = 'none';
            totalMoney = 0;
            localStorage.setItem('totalMoney', totalMoney);
        } else {
            nextButton.style.display = 'inline-block';
            totalMoney += roundMoney;
            localStorage.setItem('totalMoney', totalMoney);
        }
        roundMoney = 0;
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
        spawnedZombies = 0;
        moneyCountSpan.innerText = `$${totalMoney}`;
        zombieCountSpan.innerText = remainingZombies;
        fastZombieCountSpan.innerText = remainingFastZombies;
        overlayDiv.style.display = 'none';
        gameOverDiv.style.display = 'none';
        pauseMenu.style.display = 'none';
        shopMenu.style.display = 'none';
        zombieCounter.style.display = 'block';
        startZombieSpawning();
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
        const growthFactor = currentLevel; // Skaliert die Schwierigkeit basierend auf dem Level
    
        // Basiswerte
        const baseZombieHealth = 50; 
        const baseZombieDamage = 10;
        const baseZombieSpeed = 2;
    
        const baseFastZombieHealth = 30;
        const baseFastZombieDamage = 15;
        const baseFastZombieSpeed = 4;
    
        // Wachstumslogik
        zombieBaseHealth = baseZombieHealth + growthFactor * 10; // Zunehmende Gesundheit
        zombieBaseDamage = baseZombieDamage + growthFactor; // Zunehmender Schaden
        fastZombieBaseHealth = baseFastZombieHealth + growthFactor * 8; 
        fastZombieBaseDamage = baseFastZombieDamage + growthFactor;
    
        totalZombies = 5 + growthFactor * 3; // Erhöht die Anzahl normaler Zombies
        totalFastZombies = growthFactor >= 3 ? growthFactor * 2 : 0; // Fügt schnelle Zombies ab Level 3 hinzu
    
        setZombieSpawnInterval(
            Math.max(3000 - growthFactor * 200, 1000), // Schnelleres Spawnen
            Math.max(7000 - growthFactor * 300, 3000), 
            Math.max(2000 - growthFactor * 150, 800), 
            Math.max(5000 - growthFactor * 300, 2000)
        );
    
        remainingZombies = totalZombies;
        remainingFastZombies = totalFastZombies;
    }
    

    function setZombieSpawnInterval(normalMin, normalMax, fastMin = normalMin, fastMax = normalMax) {
        clearInterval(spawnInterval);
        spawnInterval = setInterval(() => {
            if (spawnedZombies < totalZombies + totalFastZombies && !isPaused && !inShop) {
                if (spawnedZombies < totalZombies) {
                    spawnZombie('normal');
                } else {
                    spawnZombie('fast');
                }
            } else {
                clearInterval(spawnInterval);
            }
        }, Math.random() * (fastMax - fastMin) + fastMin);
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

    function startZombieSpawning() {
        setZombieSpawnInterval(1000, 2000);
    }

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

    startLevel();
});