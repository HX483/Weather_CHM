// 创建 Vue 应用
const { createApp, ref, computed, onMounted, watch } = Vue;

const app = createApp({
    setup() {
        // 响应式数据
        const cityInput = ref('');
        const loading = ref(false);
        const showError = ref(false);
        const errorMessage = ref('');
        const weatherData = ref({
            city: '',
            temperature: '--',
            condition: '--',
            wind: '--',
            humidity: '--',
            pressure: '--',
            updateTime: '--'
        });
        const forecastData = ref([]); // 存储未来天气预报数据
        const lifeAdvice = ref([]); // 存储生活建议数据
        
        // 计算属性
        const showWeather = computed(() => {
            return weatherData.value.city !== '';
        });
        
        const weatherIcon = computed(() => {
            const condition = weatherData.value.condition;
            if (condition.includes('晴')) {
                return '☀️';
            } else if (condition.includes('云')) {
                return '☁️';
            } else if (condition.includes('雨')) {
                return '🌧️';
            } else if (condition.includes('雪')) {
                return '❄️';
            } else if (condition.includes('雾')) {
                return '🌫️';
            } else if (condition.includes('风')) {
                return '💨';
            } else {
                return '🌤️';
            }
        });
        
        // 获取天气预报图标
        const getForecastIcon = (condition) => {
            condition = condition.toLowerCase();
            if (condition.includes('晴')) {
                return '☀️';
            } else if (condition.includes('云')) {
                return '☁️';
            } else if (condition.includes('雨')) {
                return '🌧️';
            } else if (condition.includes('雪')) {
                return '❄️';
            } else if (condition.includes('雾')) {
                return '🌫️';
            } else if (condition.includes('风')) {
                return '💨';
            } else {
                return '🌤️';
            }
        };
        
        // 方法
        const getWindDirection = (degrees) => {
            const directions = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
            const index = Math.round(degrees / 45) % 8;
            return directions[index];
        };
        
        const fetchWeatherData = async (city) => {
            try {
                const apiKey = 'eca60abfae14de41b8c48955b5503743';
                console.log(`开始查询城市：${city} 的天气信息`);
                
                // 步骤1：使用地理编码API获取城市的经纬度
                console.log('调用地理编码API获取经纬度...');
                const geoApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=2&appid=${apiKey}&lang=zh_cn`;
                const geoResponse = await fetch(geoApiUrl);
                
                if (!geoResponse.ok) {
                    throw new Error(`地理编码API请求失败，状态码: ${geoResponse.status}`);
                }
                
                const geoData = await geoResponse.json();
                
                // 检查是否找到城市
                if (!geoData || geoData.length === 0) {
                    throw new Error('未找到该城市的信息');
                }
                
                // 提取经纬度
                const { lat, lon, name } = geoData[0];
                console.log(`找到城市: ${name}, 经纬度: ${lat}, ${lon}`);
                
                // 步骤2：使用当前天气API获取天气数据
                console.log('调用当前天气API获取天气信息...');
                const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
                const weatherResponse = await fetch(weatherApiUrl);
                
                if (!weatherResponse.ok) {
                    throw new Error(`天气API请求失败，状态码: ${weatherResponse.status}`);
                }
                
                const weatherDataRaw = await weatherResponse.json();
                
                // 步骤3：获取未来天气预报数据（5天/3小时预报）
                console.log('调用天气预报API获取未来天气信息...');
                const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
                const forecastResponse = await fetch(forecastApiUrl);
                
                if (!forecastResponse.ok) {
                    throw new Error(`天气预报API请求失败，状态码: ${forecastResponse.status}`);
                }
                
                const forecastDataRaw = await forecastResponse.json();
                
                // 转换OpenWeatherMap的数据格式为我们应用需要的格式
                // 使用从地理编码API获取的城市名称（已经是中文）
                const weatherInfo = {
                    city: name, // 使用geoData中获取的城市名（已经包含中文名称）
                    temperature: Math.round(weatherDataRaw.main.temp),
                    condition: weatherDataRaw.weather[0].description,
                    wind: `${getWindDirection(weatherDataRaw.wind.deg)} ${weatherDataRaw.wind.speed} m/s`,
                    humidity: `${weatherDataRaw.main.humidity}%`,
                    pressure: `${weatherDataRaw.main.pressure} hPa`,
                    updateTime: new Date().toLocaleString('zh-CN')
                };
                
                // 格式化未来天气预报数据
                const formattedForecastData = formatForecastData(forecastDataRaw.list);
                
                return { weatherData: weatherInfo, forecastData: formattedForecastData };
            } catch (error) {
                throw error;
            }
        };
        
        // 格式化未来天气预报数据
        const formatForecastData = (forecastList) => {
            // 按日期分组
            const dailyData = {};
            
            // 获取未来5天的日期
            const today = new Date();
            const nextDays = [];
            
            for (let i = 1; i <= 5; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD格式
                nextDays.push(dateStr);
            }
            
            // 初始化每天的数据
            nextDays.forEach(date => {
                dailyData[date] = {
                    temps: [],
                    conditions: []
                };
            });
            
            // 处理每个预报项
            forecastList.forEach(item => {
                const dateStr = item.dt_txt.split(' ')[0];
                if (nextDays.includes(dateStr)) {
                    dailyData[dateStr].temps.push(item.main.temp);
                    dailyData[dateStr].conditions.push(item.weather[0].description);
                }
            });
            
            // 计算每天的最高最低温度和主要天气状况
            const result = [];
            
            nextDays.forEach(dateStr => {
                const dayData = dailyData[dateStr];
                if (dayData.temps.length > 0) {
                    const maxTemp = Math.round(Math.max(...dayData.temps));
                    const minTemp = Math.round(Math.min(...dayData.temps));
                    
                    // 统计最常见的天气状况
                    const conditionCount = {};
                    dayData.conditions.forEach(cond => {
                        conditionCount[cond] = (conditionCount[cond] || 0) + 1;
                    });
                    
                    let mainCondition = dayData.conditions[0];
                    let maxCount = 0;
                    
                    Object.entries(conditionCount).forEach(([cond, count]) => {
                        if (count > maxCount) {
                            maxCount = count;
                            mainCondition = cond;
                        }
                    });
                    
                    // 格式化日期显示
          const date = new Date(dateStr);
          const dateOptions = { month: 'short', day: 'numeric' };
          const weekdayOptions = { weekday: 'short' };
          const datePart = date.toLocaleDateString('zh-CN', dateOptions);
          const weekdayPart = date.toLocaleDateString('zh-CN', weekdayOptions);
          const formattedDate = `${datePart}<br>${weekdayPart}`;
                    
                    result.push({
                        date: formattedDate,
                        maxTemp,
                        minTemp,
                        condition: mainCondition
                    });
                }
            });
            
            return result;
        };
        
        const handleSearch = async () => {
            const city = cityInput.value.trim();
            
            // 验证输入
            if (!city) {
                showError.value = true;
                errorMessage.value = '请输入城市名称';
                return;
            }
            
            // 显示加载状态
            loading.value = true;
            showError.value = false;
            
            try {
                // 获取天气数据
                const { weatherData: data, forecastData: forecast } = await fetchWeatherData(city);
                
                // 使用用户输入的城市名称替换API返回的城市名
                data.city = city;
                
                // 更新响应式数据
                weatherData.value = data;
                forecastData.value = forecast;
                
                // 生成生活建议
                lifeAdvice.value = generateLifeAdvice(data);
            } catch (error) {
                showError.value = true;
                errorMessage.value = error.message || '获取天气信息失败，请稍后重试';
                forecastData.value = []; // 清空天气预报数据
                lifeAdvice.value = []; // 清空生活建议数据
            } finally {
                // 隐藏加载状态
                loading.value = false;
            }
        };
        
        // 生成生活建议
        function generateLifeAdvice(weatherData) {
            const advice = [];
            const temp = weatherData.temperature;
            const humidity = parseInt(weatherData.humidity);
            const condition = weatherData.condition.toLowerCase();
            const hasWind = weatherData.wind && weatherData.wind.includes('m/s');
            const windSpeed = hasWind ? parseFloat(weatherData.wind.split(' ')[1]) : 0;
            
            // 穿衣建议
            let clothingAdvice = '';
            if (temp >= 30) {
                clothingAdvice = '天气炎热，建议穿短袖、短裤、薄长裙等清凉透气的衣物，注意防晒。';
            } else if (temp >= 25) {
                clothingAdvice = '天气温暖，建议穿短袖、薄长裤、薄外套等，早晚温差较大可适当增减衣物。';
            } else if (temp >= 20) {
                clothingAdvice = '天气舒适，建议穿长袖衬衫、薄外套、休闲装等，适合外出活动。';
            } else if (temp >= 15) {
                clothingAdvice = '天气转凉，建议穿长袖衬衫、毛衣、夹克等保暖衣物，注意保暖。';
            } else if (temp >= 10) {
                clothingAdvice = '天气较冷，建议穿毛衣、外套、风衣等厚实衣物，早晚注意增添衣物。';
            } else if (temp >= 5) {
                clothingAdvice = '天气寒冷，建议穿棉衣、羽绒服、厚毛衣等保暖衣物，戴帽子手套防寒。';
            } else {
                clothingAdvice = '天气严寒，建议穿厚羽绒服、厚棉衣等保暖性能好的衣物，注意防寒保暖。';
            }
            
            advice.push({
                type: '穿衣建议',
                icon: '👔',
                text: clothingAdvice
            });
            
            // 出行建议
            let travelAdvice = '';
            if (condition.includes('雨')) {
                travelAdvice = '有雨，建议携带雨具出行，道路可能湿滑，注意安全驾驶。';
            } else if (condition.includes('雪')) {
                travelAdvice = '有雪，道路可能结冰，出行请小心驾驶，注意交通安全。';
            } else if (condition.includes('雾') || condition.includes('霾')) {
                travelAdvice = '能见度较低，建议减少不必要的外出，驾车时开启雾灯，保持安全距离。';
            } else if (windSpeed > 5) {
                travelAdvice = '风力较大，出行时注意防风，高空作业需谨慎，避免在广告牌等高空物体下停留。';
            } else if (temp > 35 || temp < 0) {
                travelAdvice = '温度极端，建议减少长时间户外活动，注意防暑或防寒。';
            } else {
                travelAdvice = '天气条件良好，适合外出活动，注意做好防晒措施。';
            }
            
            advice.push({
                type: '出行建议',
                icon: '🚗',
                text: travelAdvice
            });
            
            // 运动建议
            let sportAdvice = '';
            if (condition.includes('雨') || condition.includes('雪')) {
                sportAdvice = '不适合户外运动，建议选择室内运动，如瑜伽、健身等。';
            } else if (condition.includes('雾') || condition.includes('霾')) {
                sportAdvice = '空气质量不佳，建议减少户外运动，可选择室内运动。';
            } else if (temp > 35) {
                sportAdvice = '温度过高，避免在中午高温时段进行户外运动，注意补充水分，防止中暑。';
            } else if (temp < 5) {
                sportAdvice = '温度较低，运动前应充分热身，穿着保暖透气的运动服装，运动后及时更换衣物。';
            } else if (humidity > 80) {
                sportAdvice = '湿度较大，运动时注意补充水分，避免剧烈运动导致身体不适。';
            } else if (windSpeed > 8) {
                sportAdvice = '风力较大，不适合户外运动，尤其是球类运动。';
            } else {
                sportAdvice = '天气条件适宜运动，可以进行各种户外运动，如跑步、骑行、球类运动等。';
            }
            
            advice.push({
                type: '运动建议',
                icon: '🏃',
                text: sportAdvice
            });
            
            // 健康建议
            let healthAdvice = '';
            if (condition.includes('雨') || condition.includes('雪')) {
                healthAdvice = '天气多变，注意保暖，预防感冒，保持室内空气流通。';
            } else if (condition.includes('雾') || condition.includes('霾')) {
                healthAdvice = '空气质量较差，外出时建议佩戴口罩，回家后及时清洁面部和鼻腔。';
            } else if (temp > 30) {
                healthAdvice = '高温天气，注意防暑降温，多喝水，避免长时间在阳光下暴晒。';
            } else if (temp < 10) {
                healthAdvice = '气温较低，注意保暖，特别是老人和儿童，预防感冒和呼吸道疾病。';
            } else if (humidity < 30) {
                healthAdvice = '空气干燥，注意多喝水，使用加湿器，预防皮肤干燥和呼吸道不适。';
            } else {
                healthAdvice = '天气舒适，是养生的好时机，建议多进行户外活动，保持良好的作息习惯。';
            }
            
            advice.push({
                type: '健康建议',
                icon: '💊',
                text: healthAdvice
            });
            
            return advice;
        };
        
        const clearError = () => {
            showError.value = false;
        };
        
        // 键盘快捷键支持
        const handleKeydown = (e) => {
            // Ctrl/Cmd + Enter 触发搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSearch();
            }
        };
        
        // 生命周期钩子 - 第一个定义将被覆盖，已在文件底部合并

        // 计算当前时间是否为夜晚（19:00-6:00）
const isNight = computed(() => {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6;
});

// 根据天气状况和时间获取背景类名
const backgroundClass = computed(() => {
    if (!showWeather.value) return '';
    
    const condition = weatherData.value.condition.toLowerCase();
    const isNightTime = isNight.value;
    
    if (condition.includes('晴')) {
        return isNightTime ? 'clear-sky-night' : 'clear-sky-day';
    } else if (condition.includes('雨')) {
        return 'rainy';
    } else if (condition.includes('雪')) {
        return 'snowy';
    } else if (condition.includes('云')) {
        return 'cloudy';
    } else if (condition.includes('雾')) {
        return 'foggy';
    } else if (condition.includes('风')) {
        return 'windy';
    }
    
    return isNightTime ? 'clear-sky-night' : 'clear-sky-day';
});

// 清除所有天气特效元素
const clearWeatherEffects = () => {
    document.querySelectorAll('.star, .moon, .meteor, .cloud').forEach(el => el.remove());
};

// 创建星空效果（仅在夜晚晴空时）
const createStarfield = () => {
    clearWeatherEffects();
    
    if (backgroundClass.value !== 'clear-sky-night') return;
    
    const body = document.body;
    
    // 创建月亮
    const moon = document.createElement('div');
    moon.className = 'moon';
    body.appendChild(moon);
    
    // 创建星星
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        star.style.width = `${Math.random() * 2 + 1}px`;
        star.style.height = star.style.width;
        star.style.animationDelay = `${Math.random() * 2}s`;
        body.appendChild(star);
    }
    
    // 定时创建流星
    const createMeteor = () => {
        if (backgroundClass.value !== 'clear-sky-night') return;
        
        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        meteor.style.left = `${Math.random() * 100}vw`;
        meteor.style.top = `${Math.random() * 30}vh`;
        body.appendChild(meteor);
        
        // 流星消失后移除元素
        setTimeout(() => {
            meteor.remove();
        }, 1000);
    };
    
    // 随机时间创建流星
    setInterval(createMeteor, 5000 + Math.random() * 15000);
};


        
        // 监听背景类变化，更新天气效果
        watch(backgroundClass, (newClass) => {
            // 移除所有背景类
            document.body.className = document.body.className
                .split(' ')
                .filter(cls => !['clear-sky-day', 'clear-sky-night', 'rainy', 'snowy', 'cloudy', 'foggy', 'windy'].includes(cls))
                .join(' ');
            
            // 添加新的背景类
            if (newClass) {
                document.body.classList.add(newClass);
            }
            
            // 清除所有天气特效
            clearWeatherEffects();
            
            // 创建对应的天气效果
            if (newClass === 'clear-sky-night') {
                createStarfield();
            } else if (newClass === 'cloudy') {
                // 创建4朵自然形状的云朵
                createCloud('cloud-1');
                createCloud('cloud-2');
                createCloud('cloud-3');
                createCloud('cloud-4');
            }
        });

        // 获取用户当前位置并查询天气
const getUserLocationAndWeather = async () => {
    if (!navigator.geolocation) {
        console.log('浏览器不支持地理定位');
        return;
    }

    loading.value = true;
    showError.value = false;

    try {
        console.log('请求用户位置...');
        // 使用Geolocation API获取用户位置
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });

        const { latitude: lat, longitude: lon } = position.coords;
        console.log(`获取到用户位置: 纬度 ${lat}, 经度 ${lon}`);

        // 直接使用经纬度获取天气数据
        const { weatherData: data, forecastData: forecast } = await fetchWeatherByCoordinates(lat, lon);
        
        // 更新响应式数据
        weatherData.value = data;
        forecastData.value = forecast;
        lifeAdvice.value = generateLifeAdvice(data);
    } catch (error) {
        console.error('获取位置失败:', error);
        // 不显示错误信息，避免影响用户体验，用户仍然可以手动输入城市查询
        // showError.value = true;
        // errorMessage.value = '无法获取您的位置，请手动输入城市查询';
    } finally {
        loading.value = false;
    }
};

// 新增：通过经纬度获取天气数据的函数
const fetchWeatherByCoordinates = async (lat, lon) => {
    try {
        const apiKey = 'eca60abfae14de41b8c48955b5503743';
        console.log(`使用经纬度查询天气: ${lat}, ${lon}`);
        
            // 关键新增：通过经纬度调用反向地理编码，获取中文城市名
        console.log('调用反向地理编码API获取中文城市名...');
        const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}&lang=zh_cn`;
        const reverseGeoResponse = await fetch(reverseGeoUrl);
        
        if (!reverseGeoResponse.ok) {
            throw new Error(`反向地理编码请求失败，状态码: ${reverseGeoResponse.status}`);
        }
        
        const reverseGeoData = await reverseGeoResponse.json();
        let chineseCityName = '';
        if (reverseGeoData && reverseGeoData.length > 0) {
            chineseCityName = reverseGeoData[0].name; // 提取中文城市名
        }

        // 步骤1：使用当前天气API获取天气数据
        console.log('调用当前天气API获取天气信息...');
        const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        const weatherResponse = await fetch(weatherApiUrl);
        
        if (!weatherResponse.ok) {
            throw new Error(`天气API请求失败，状态码: ${weatherResponse.status}`);
        }
        
        const weatherDataRaw = await weatherResponse.json();
        
        // 步骤2：获取未来天气预报数据
        console.log('调用天气预报API获取未来天气信息...');
        const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        const forecastResponse = await fetch(forecastApiUrl);
        
        if (!forecastResponse.ok) {
            throw new Error(`天气预报API请求失败，状态码: ${forecastResponse.status}`);
        }
        
        const forecastDataRaw = await forecastResponse.json();
        
        // 转换数据格式
        const weatherInfo = {
            city: chineseCityName ||weatherDataRaw.name,
            temperature: Math.round(weatherDataRaw.main.temp),
            condition: weatherDataRaw.weather[0].description,
            wind: `${getWindDirection(weatherDataRaw.wind.deg)} ${weatherDataRaw.wind.speed} m/s`,
            humidity: `${weatherDataRaw.main.humidity}%`,
            pressure: `${weatherDataRaw.main.pressure} hPa`,
            updateTime: new Date().toLocaleString('zh-CN')
        };
        
        // 格式化未来天气预报数据
        const formattedForecastData = formatForecastData(forecastDataRaw.list);
        
        return { weatherData: weatherInfo, forecastData: formattedForecastData };
    } catch (error) {
        throw error;
    }
};

// 创建云朵函数
const createCloud = (cloudClass) => {
    // 创建云朵容器
    const cloudContainer = document.createElement('div');
    cloudContainer.className = `cloud ${cloudClass}`;
    
    // 创建基础椭圆部分
    const cloudBase = document.createElement('div');
    cloudBase.className = `${cloudClass}-base`;
    
    // 创建云朵主体（已经通过CSS伪元素实现云朵的圆形部分）
    cloudContainer.appendChild(cloudBase);
    
    // 添加到body
    document.body.appendChild(cloudContainer);
};

// 在onMounted钩子中调用获取位置的函数
onMounted(() => {
    // 自动聚焦到输入框
    const input = document.querySelector('.city-input');
    if (input) {
        input.focus();
    }
    
    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeydown);
    
    // 新增：获取用户位置并查询天气
    getUserLocationAndWeather();
});

        // 暴露给模板的数据和方法
        return {
            cityInput,
            loading,
            showError,
            errorMessage,
            weatherData,
            forecastData,
            lifeAdvice,
            showWeather,
            weatherIcon,
            getForecastIcon,
            handleSearch,
            clearError,
            backgroundClass
        };
    }
});

// 挂载应用
app.mount('#app');