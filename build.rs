fn main() {
    println!("cargo:rerun-if-changed=Icon/ChronoIcon.ico");
    println!("cargo:rerun-if-changed=Icon/ChronoIcon.png");
    println!("cargo:rerun-if-changed=build.rs");

    #[cfg(target_os = "windows")]
    {
        let out_dir = std::env::var("OUT_DIR").unwrap();
        let res_path = std::path::Path::new(&out_dir).join("chrono.res");
        let rc_path = std::path::Path::new(&out_dir).join("chrono.rc");

        let ico_path = std::fs::canonicalize("Icon/ChronoIcon.ico")
            .expect("Icon/ChronoIcon.ico must exist");
        let mut ico_str = ico_path.to_str().unwrap().to_string();
        if ico_str.starts_with(r"\\?\") {
            ico_str = ico_str[4..].to_string();
        }
        let ico_str_escaped = ico_str.replace('\\', "/");

        let rc_content = format!(
r#"1 ICON "{ico_path}"
1 VERSIONINFO
FILEVERSION 1,0,0,0
PRODUCTVERSION 1,0,0,0
FILEFLAGSMASK 0x3fL
FILEFLAGS 0x0L
FILEOS 0x40004L
FILETYPE 0x1L
FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "040904b0"
        BEGIN
            VALUE "CompanyName", "Vixino3rd\0"
            VALUE "FileDescription", "Chrono Evades.io Desktop Client\0"
            VALUE "FileVersion", "1.0.0.0\0"
            VALUE "InternalName", "chrono-evades\0"
            VALUE "LegalCopyright", "Copyright (c) 2026 Vixino3rd. All Rights Reserved.\0"
            VALUE "OriginalFilename", "chrono-evades.exe\0"
            VALUE "ProductName", "Chrono Client\0"
            VALUE "ProductVersion", "1.0.0.0\0"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x409, 1200
    END
END
"#,
            ico_path = ico_str_escaped
        );

        std::fs::write(&rc_path, rc_content).unwrap();

        let rc_exe_candidates = [
            r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\rc.exe",
            r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\rc.exe",
            r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\rc.exe",
            r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.18362.0\x64\rc.exe",
        ];

        let mut compiled = false;
        for rc_exe in rc_exe_candidates {
            if std::path::Path::new(rc_exe).exists() {
                let status = std::process::Command::new(rc_exe)
                    .arg("/fo")
                    .arg(&res_path)
                    .arg(&rc_path)
                    .status();
                if let Ok(s) = status {
                    if s.success() {
                        compiled = true;
                        break;
                    }
                }
            }
        }

        if compiled {
            println!("cargo:rustc-link-arg={}", res_path.display());
        } else {
            let mut res = winres::WindowsResource::new();
            res.set_icon(&ico_str);
            res.set("FileDescription", "Chrono Evades.io Desktop Client");
            res.set("ProductName", "Chrono Client");
            res.set("CompanyName", "Vixino3rd");
            res.set("LegalCopyright", "Copyright (c) 2026 Vixino3rd. All Rights Reserved.");
            res.set("OriginalFilename", "chrono-evades.exe");
            res.set("FileVersion", "1.0.0.0");
            res.set("ProductVersion", "1.0.0.0");
            let _ = res.compile();
        }
    }
}
