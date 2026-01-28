use std::env;

#[tauri::command]
pub async fn get_system_language() -> Result<String, String> {
    let system_lang = detect_system_language();
    Ok(system_lang)
}

fn detect_system_language() -> String {
    #[cfg(target_os = "windows")]
    {
        detect_windows_language()
    }

    #[cfg(target_os = "macos")]
    {
        detect_macos_language()
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        detect_fallback_language()
    }
}

#[cfg(target_os = "windows")]
fn detect_windows_language() -> String {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hklm = RegKey::preopen(HKEY_CURRENT_USER, r"Control Panel\Desktop")
        .map_err(|e| format!("Failed to open registry: {e}"));

    if let Ok(key) = hklm {
        if let Ok(lang) = key.get_value::<String>("PreferredUILanguages") {
            return map_language_code(&lang);
        }
    }

    let hkcu = RegKey::preopen(HKEY_CURRENT_USER, r"Control Panel\Desktop\MuiCached")
        .map_err(|e| format!("Failed to open registry: {e}"));

    if let Ok(key) = hkcu {
        if let Ok(lang) = key.get_value::<String>("PreferredUILanguages") {
            return map_language_code(&lang);
        }
    }

    detect_fallback_language()
}

#[cfg(target_os = "macos")]
fn detect_macos_language() -> String {
    use objc::rc::autoreleasepool;
    use objc::{class, msg_send_id, sel, sel_impl};

    autoreleasepool(|| unsafe {
        let locale_class = class!(NSLocale);
        let current_locale: objc::id = msg_send_id![locale_class, currentLocale];
        let language_code: objc::id = msg_send_id![current_locale, languageCode];
        let lang_str: *const u8 = msg_send_id![language_code, UTF8String];

        if !lang_str.is_null() {
            let lang = std::ffi::CStr::from_ptr(lang_str as *const i8);
            let lang_string = lang.to_string_lossy().to_string();
            return map_language_code(&lang_string);
        }

        detect_fallback_language()
    })
}

fn detect_fallback_language() -> String {
    env::var("LANG")
        .ok()
        .and_then(|lang| {
            let lang_code = lang.split('.').next().unwrap_or(&lang);
            Some(map_language_code(lang_code))
        })
        .unwrap_or_else(|| "en".to_string())
}

fn map_language_code(lang: &str) -> String {
    let lang_lower = lang.to_lowercase();

    if lang_lower.starts_with("zh") {
        return "zh-CN".to_string();
    }

    if lang_lower.starts_with("en") {
        return "en".to_string();
    }

    "en".to_string()
}
