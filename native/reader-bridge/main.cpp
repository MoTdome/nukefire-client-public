// NukeFire Native Reader bridge.
// PRISM is fetched at pinned v0.18.2 and linked statically.
// Wire protocol: one UTF-8, tab-delimited command per line; text is base64.

#include <prism.h>

#include <array>
#include <cctype>
#include <cstdint>
#include <iostream>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

namespace {

constexpr std::size_t kMaxDecodedText = 32 * 1024;

std::vector<std::string> split_tabs(const std::string &line) {
  std::vector<std::string> parts;
  std::size_t start = 0;
  while (start <= line.size()) {
    const auto at = line.find('\t', start);
    if (at == std::string::npos) {
      parts.emplace_back(line.substr(start));
      break;
    }
    parts.emplace_back(line.substr(start, at - start));
    start = at + 1;
  }
  return parts;
}

int b64_value(unsigned char c) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;
  if (c == '+') return 62;
  if (c == '/') return 63;
  return -1;
}

bool decode_base64(std::string_view input, std::string &out) {
  out.clear();
  int value = 0;
  int bits = -8;
  for (unsigned char c : input) {
    if (c == '=') break;
    if (std::isspace(c)) continue;
    const int decoded = b64_value(c);
    if (decoded < 0) return false;
    value = (value << 6) | decoded;
    bits += 6;
    if (bits >= 0) {
      out.push_back(static_cast<char>((value >> bits) & 0xFF));
      bits -= 8;
      if (out.size() > kMaxDecodedText) return false;
    }
  }
  return true;
}

std::string encode_base64(std::string_view input) {
  static constexpr char table[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string out;
  out.reserve(((input.size() + 2) / 3) * 4);
  std::uint32_t value = 0;
  int bits = -6;
  for (unsigned char c : input) {
    value = (value << 8) | c;
    bits += 8;
    while (bits >= 0) {
      out.push_back(table[(value >> bits) & 0x3F]);
      bits -= 6;
    }
  }
  if (bits > -6) out.push_back(table[((value << 8) >> (bits + 8)) & 0x3F]);
  while (out.size() % 4) out.push_back('=');
  return out;
}

bool parse_id(const std::string &value, std::uint64_t &id) {
  if (value.empty()) return false;
  try {
    std::size_t used = 0;
    const auto parsed = std::stoull(value, &used, 10);
    if (used != value.size() || parsed == 0) return false;
    id = parsed;
    return true;
  } catch (...) {
    return false;
  }
}

void respond_ok(std::uint64_t id, std::string_view operation,
                std::string_view backend = {}, std::uint64_t features = 0) {
  std::cout << "OK\t" << id << '\t' << operation;
  if (!backend.empty() || features != 0) {
    std::ostringstream feature_text;
    feature_text << std::hex << features;
    std::cout << '\t' << encode_base64(backend) << '\t' << feature_text.str();
  }
  std::cout << '\n' << std::flush;
}

void respond_error(std::uint64_t id, std::string_view code,
                   std::string_view message) {
  std::cout << "ERR\t" << id << '\t' << code << '\t'
            << encode_base64(message) << '\n' << std::flush;
}

class ReaderBackend {
 public:
  ReaderBackend() : context_(prism_init(nullptr)) {}
  ~ReaderBackend() {
    reset_backend();
    if (context_ != nullptr) prism_shutdown(context_);
  }

  bool ready() {
    if (backend_ != nullptr) return true;
    return acquire_backend();
  }

  std::string_view name() const {
    if (backend_ == nullptr) return {};
    const char *name = prism_backend_name(backend_);
    return name != nullptr ? std::string_view{name} : std::string_view{};
  }

  std::uint64_t features() const {
    return backend_ != nullptr ? prism_backend_get_features(backend_) : 0;
  }

  PrismError output(std::string_view text, bool interrupt) {
    if (!ready()) return PRISM_ERROR_BACKEND_NOT_AVAILABLE;
    const std::string owned{text};
    const auto result = prism_backend_output(backend_, owned.c_str(), interrupt);
    if (result != PRISM_OK) reset_backend();
    return result;
  }

  PrismError speak(std::string_view text, bool interrupt) {
    if (!ready()) return PRISM_ERROR_BACKEND_NOT_AVAILABLE;
    const std::string owned{text};
    const auto result = prism_backend_speak(backend_, owned.c_str(), interrupt);
    if (result != PRISM_OK) reset_backend();
    return result;
  }

  PrismError stop() {
    if (!ready()) return PRISM_ERROR_BACKEND_NOT_AVAILABLE;
    const auto result = prism_backend_stop(backend_);
    if (result != PRISM_OK && result != PRISM_ERROR_NOT_SPEAKING) reset_backend();
    return result;
  }

 private:
  bool acquire_backend() {
    if (context_ == nullptr) return false;

    // First prototype is intentionally screen-reader-specific. Do not silently
    // fall back to SAPI/OneCore and create a second speech owner.
    constexpr std::array<PrismBackendId, 2> candidates{
        PRISM_BACKEND_NVDA,
        PRISM_BACKEND_JAWS,
    };

    for (const auto id : candidates) {
      if (!prism_registry_exists(context_, id)) continue;
      PrismBackend *candidate = prism_registry_create(context_, id);
      if (candidate == nullptr) continue;
      const auto initialized = prism_backend_initialize(candidate);
      if (initialized == PRISM_OK) {
        backend_ = candidate;
        return true;
      }
      prism_backend_free(candidate);
    }
    return false;
  }

  void reset_backend() {
    if (backend_ != nullptr) {
      prism_backend_free(backend_);
      backend_ = nullptr;
    }
  }

  PrismContext *context_{nullptr};
  PrismBackend *backend_{nullptr};
};

}  // namespace

int main() {
  std::ios::sync_with_stdio(false);
  std::cin.tie(nullptr);

  ReaderBackend reader;
  std::string line;

  while (std::getline(std::cin, line)) {
    if (!line.empty() && line.back() == '\r') line.pop_back();
    const auto parts = split_tabs(line);
    if (parts.size() < 2) continue;

    std::uint64_t id = 0;
    if (!parse_id(parts[1], id)) continue;
    const auto &operation = parts[0];

    if (operation == "HELLO" || operation == "STATUS") {
      if (!reader.ready()) {
        respond_error(id, "backend-unavailable",
                      "No supported running Native Reader backend was found.");
        continue;
      }
      respond_ok(id, operation, reader.name(), reader.features());
      continue;
    }

    if (operation == "STOP") {
      const auto result = reader.stop();
      if (result == PRISM_OK || result == PRISM_ERROR_NOT_SPEAKING) {
        respond_ok(id, operation, reader.name(), reader.features());
      } else {
        respond_error(id, "backend-failed", prism_error_string(result));
      }
      continue;
    }

    if (operation == "SPEAK" || operation == "OUTPUT") {
      if (parts.size() != 4) {
        respond_error(id, "invalid-request", "Malformed speech request.");
        continue;
      }

      const bool interrupt = parts[2] == "1";
      std::string text;
      if (!decode_base64(parts[3], text) || text.empty()) {
        respond_error(id, "invalid-text", "Speech payload is invalid.");
        continue;
      }

      const auto result = operation == "OUTPUT"
                              ? reader.output(text, interrupt)
                              : reader.speak(text, interrupt);
      if (result == PRISM_OK) {
        respond_ok(id, operation, reader.name(), reader.features());
      } else {
        respond_error(id, "backend-failed", prism_error_string(result));
      }
      continue;
    }

    respond_error(id, "invalid-operation",
                  "Unknown Native Reader bridge operation.");
  }

  return 0;
}
