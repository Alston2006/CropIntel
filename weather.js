// =======================================
// Weather Intelligence Core Controller
// NO WINDY CODE HERE
// =======================================


// MODAL CONTROLS

function openWeatherModal()
{
    document
    .getElementById("weatherModal")
    .classList.add("active");
}


function closeWeatherModal()
{
    document
    .getElementById("weatherModal")
    .classList.remove("active");
}


function openWeatherLive()
{
    document
    .getElementById("weatherLiveModal")
    .classList.add("active");
}


function closeWeatherLive()
{
    document
    .getElementById("weatherLiveModal")
    .classList.remove("active");
}



// REALTIME WEATHER DATA TEXT

async function loadWeatherData()
{

    try
    {

        const response =
        await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=12.9141&longitude=74.8560&current_weather=true"
        );


        const data = await response.json();


        document.getElementById("weatherData").innerHTML =
        `
        🌡 Temperature: ${data.current_weather.temperature} °C<br><br>

        🌬 Wind Speed: ${data.current_weather.windspeed} km/h<br><br>

        🧭 Wind Direction: ${data.current_weather.winddirection}°
        `;

    }

    catch(error)
    {

        document.getElementById("weatherData").innerHTML =
        "Weather intelligence unavailable.";

    }

}


// LOAD DATA

loadWeatherData();

setInterval(loadWeatherData, 900000);