#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "your_wifi";
const char* password = "your_pass";

const String supabaseUrl = "https://jtwzikkmixrtwwcogljp.supabase.co";
const String bucket = "food-images";
const String apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0d3ppa2ttaXhydHd3Y29nbGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1Njk2NzEsImV4cCI6MjA4MzE0NTY3MX0.fY2YCKBsXUfEoWGP0l7zuUQFPxxzz9R2ws6w3Nd2kp0"; // Use anon key for public, service for private

void uploadImage(const uint8_t* imageData, size_t imageSize, const String& filename) {
  HTTPClient http;
  String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + filename;

  http.begin(url);
  http.addHeader("apikey", apiKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.addHeader("Content-Type", "image/jpeg"); // adjust for your format

  int httpCode = http.POST(imageData, imageSize);

  if (httpCode > 0) {
    Serial.printf("Upload status: %d\n", httpCode);
  } else {
    Serial.println("Upload failed");
  }
  http.end();
}