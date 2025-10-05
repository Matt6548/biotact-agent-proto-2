# -*- coding: utf-8 -*-
import os, ssl, smtplib, mimetypes
from email.message import EmailMessage

def send_email(to_list, subject, html, attachments=None, dry_run=False):
    host = os.getenv("SMTP_HOST"); port = int(os.getenv("SMTP_PORT","465"))
    user = os.getenv("SMTP_USER");  pwd  = os.getenv("SMTP_PASS")
    from_addr = os.getenv("SMTP_FROM", user); from_name = os.getenv("SMTP_FROM_NAME","Biotact")

    if dry_run: 
        return {"ok": True, "dry_run": True, "subject": subject, "to": to_list[:3]}

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_addr}>"
    msg["To"] = ", ".join(to_list)
    msg.set_content("HTML only"); msg.add_alternative(html, subtype="html")

    for p in attachments or []:
        ctype, _ = mimetypes.guess_type(p)
        maintype, subtype = (ctype or "application/octet-stream").split("/",1)
        with open(p,"rb") as f:
            msg.add_attachment(f.read(), maintype=maintype, subtype=subtype, filename=os.path.basename(p))

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, port, context=ctx) as s:
        s.login(user, pwd); s.send_message(msg)
    return {"ok": True}
