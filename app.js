// 创建 Vue 应用
const { createApp, ref, computed, onMounted } = Vue;

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
                const geoApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=2&appid=${apiKey}`;
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
                
                // 转换OpenWeatherMap的数据格式为我们应用需要的格式
                const weatherInfo = {
                    city: weatherDataRaw.name,
                    temperature: Math.round(weatherDataRaw.main.temp),
                    condition: weatherDataRaw.weather[0].description,
                    wind: `${getWindDirection(weatherDataRaw.wind.deg)} ${weatherDataRaw.wind.speed} m/s`,
                    humidity: `${weatherDataRaw.main.humidity}%`,
                    pressure: `${weatherDataRaw.main.pressure} hPa`,
                    updateTime: new Date().toLocaleString('zh-CN')
                };
                
                return weatherInfo;
            } catch (error) {
                throw error;
            }
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
                const data = await fetchWeatherData(city);
                
                // 使用用户输入的城市名称替换API返回的城市名
                data.city = city;
                
                // 更新响应式数据
                weatherData.value = data;
            } catch (error) {
                showError.value = true;
                errorMessage.value = error.message || '获取天气信息失败，请稍后重试';
            } finally {
                // 隐藏加载状态
                loading.value = false;
            }
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
        
        // 生命周期钩子
        onMounted(() => {
            // 自动聚焦到输入框
            const input = document.querySelector('.city-input');
            if (input) {
                input.focus();
            }
            
            // 添加全局键盘事件监听
            document.addEventListener('keydown', handleKeydown);
        });
        
        // 暴露给模板的数据和方法
        return {
            cityInput,
            loading,
            showError,
            errorMessage,
            weatherData,
            showWeather,
            weatherIcon,
            handleSearch,
            clearError
        };
    }
});

// 挂载应用
app.mount('#app');