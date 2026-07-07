#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert the merged handbook .docx to PDF via a headless LibreOffice Basic macro,
forcing a full field update (Tools > Update > Update All: TOC, Index, page-number
fields, etc.) before export.

Why not `soffice --headless --convert-to pdf` directly: it does NOT recalculate
TOC/INDEX fields, it just carries over whatever placeholder text was in the
source paragraph.

Why not a python-uno socket/pipe listener: in this sandboxed environment,
anything that opens a listening socket (TCP or named pipe, for the standard
`--accept=` UNO bridge) is killed outright. And calling
`document.getDocumentIndexes()` directly via UNO (even in-process via a Basic
macro) reliably crashes this particular headless LibreOffice install (no GUI
components beyond core+writer). The combination that *does* work: load the
document via a one-shot Basic macro (no socket needed), then dispatch the
UI-equivalent command `.uno:UpdateAll` (exactly what Ctrl+A, F9 / "Update All"
does in the Word/Writer UI) instead of touching the Index API directly, then
export to PDF.

Usage:
    python3 convert_to_pdf.py <input.docx> <output.pdf>
"""
import os
import subprocess
import sys
import tempfile

MODULE_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">REM  *****  BASIC  *****

Sub Main
    Dim oDesktop As Object
    Dim oDoc As Object
    Dim oArgs(0) As New com.sun.star.beans.PropertyValue
    Dim iFile As Integer
    Dim oFrame As Object
    Dim oDispatcher As Object

    iFile = FreeFile
    Open "{log_path}" For Output As #iFile
    Print #iFile, "start"
    Close #iFile

    oDesktop = createUnoService("com.sun.star.frame.Desktop")

    oArgs(0).Name = "Hidden"
    oArgs(0).Value = True

    oDoc = oDesktop.loadComponentFromURL("{input_url}", "_blank", 0, oArgs())

    iFile = FreeFile
    Open "{log_path}" For Append As #iFile
    Print #iFile, "doc loaded"
    Close #iFile

    oFrame = oDoc.getCurrentController().getFrame()
    oDispatcher = createUnoService("com.sun.star.frame.DispatchHelper")
    oDispatcher.executeDispatch(oFrame, ".uno:UpdateAll", "", 0, Array())

    iFile = FreeFile
    Open "{log_path}" For Append As #iFile
    Print #iFile, "updateall dispatched"
    Close #iFile

    Dim oPdfArgs(0) As New com.sun.star.beans.PropertyValue
    oPdfArgs(0).Name = "FilterName"
    oPdfArgs(0).Value = "writer_pdf_Export"
    oDoc.storeToURL("{output_url}", oPdfArgs())

    iFile = FreeFile
    Open "{log_path}" For Append As #iFile
    Print #iFile, "pdf exported"
    Close #iFile

    oDoc.close(False)
    oDesktop.terminate()
End Sub
</script:module>
"""

SCRIPT_XLB = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE library:libraries PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "libraries.dtd">
<library:libraries xmlns:library="http://openoffice.org/2000/library" library:readonly="false">
 <library:library library:name="Standard" library:link="false"/>
</library:libraries>
"""

STANDARD_XLB = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">
<library:library xmlns:library="http://openoffice.org/2000/library" library:name="Standard" library:readonly="false" library:passwordprotected="false">
 <library:element library:name="Module1"/>
</library:library>
"""


def to_file_url(path):
    return "file://" + os.path.abspath(path)


def convert(input_docx, output_pdf, timeout=300):
    input_docx = os.path.abspath(input_docx)
    output_pdf = os.path.abspath(output_pdf)

    with tempfile.TemporaryDirectory(prefix="lo_profile_") as profile_dir:
        basic_dir = os.path.join(profile_dir, "user", "basic", "Standard")
        os.makedirs(basic_dir, exist_ok=True)
        with open(os.path.join(profile_dir, "user", "basic", "script.xlb"), "w") as f:
            f.write(SCRIPT_XLB)
        with open(os.path.join(basic_dir, "script.xlb"), "w") as f:
            f.write(STANDARD_XLB)

        log_path = "/tmp/handbook_lo_macro_log.txt"
        if os.path.exists(log_path):
            os.remove(log_path)

        module = MODULE_TEMPLATE.format(
            log_path=log_path,
            input_url=to_file_url(input_docx),
            output_url=to_file_url(output_pdf),
        )
        with open(os.path.join(basic_dir, "Module1.xba"), "w") as f:
            f.write(module)

        cmd = [
            "soffice", "--headless", "--invisible", "--nocrashreport",
            "--nodefault", "--norestore", "--nologo", "--nofirststartwizard",
            "--nolockcheck", f"-env:UserInstallation=file://{profile_dir}",
            "vnd.sun.star.script:Standard.Module1.Main?language=Basic&location=application",
        ]

        driver_log = "/tmp/handbook_convert_driver.log"
        with open(driver_log, "w") as dlog:
            dlog.write("about to run bootstrap pass\n")
            dlog.flush()

            # A brand-new user profile's very first soffice launch resets
            # user/basic/Standard/Module1.xba to LibreOffice's blank default
            # template, discarding whatever we pre-seeded -- so the macro
            # silently never runs on that first invocation. Do one throwaway
            # launch to let LibreOffice finish initializing the fresh profile,
            # then re-write our real macro and invoke it for the run that counts.
            r1 = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
            dlog.write(f"bootstrap pass rc={r1.returncode}\n")
            dlog.write(f"bootstrap stdout={r1.stdout}\nbootstrap stderr={r1.stderr}\n")
            dlog.flush()

            if os.path.exists(log_path):
                os.remove(log_path)
            with open(os.path.join(basic_dir, "Module1.xba"), "w") as f:
                f.write(module)

            dlog.write("about to run real pass\n")
            dlog.flush()
            result = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
            dlog.write(f"real pass rc={result.returncode}\n")
            dlog.flush()
        print("soffice stdout:", result.stdout)
        print("soffice stderr:", result.stderr)

        log_contents = ""
        if os.path.exists(log_path):
            with open(log_path) as f:
                log_contents = f.read()
        print("--- macro log ---")
        print(log_contents)

        if not os.path.exists(output_pdf):
            raise RuntimeError(
                f"PDF export failed -- {output_pdf} was not created. "
                f"Macro log:\n{log_contents}"
            )
        if "pdf exported" not in log_contents:
            raise RuntimeError(
                f"Macro did not reach the 'pdf exported' step. Log:\n{log_contents}"
            )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: convert_to_pdf.py <input.docx> <output.pdf>")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
    print(f"OK: wrote {sys.argv[2]}")
