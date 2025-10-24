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
        const forecastData = ref([]); // 存储未来天气预报数据
        
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
                
                // 步骤3：获取未来天气预报数据（5天/3小时预报）
                console.log('调用天气预报API获取未来天气信息...');
                const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
                const forecastResponse = await fetch(forecastApiUrl);
                
                if (!forecastResponse.ok) {
                    throw new Error(`天气预报API请求失败，状态码: ${forecastResponse.status}`);
                }
                
                const forecastDataRaw = await forecastResponse.json();
                
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
            } catch (error) {
                showError.value = true;
                errorMessage.value = error.message || '获取天气信息失败，请稍后重试';
                forecastData.value = []; // 清空天气预报数据
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
            forecastData,
            showWeather,
            weatherIcon,
            getForecastIcon,
            handleSearch,
            clearError
        };
    }
});

// 挂载应用
app.mount('#app');