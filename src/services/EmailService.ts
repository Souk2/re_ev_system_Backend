import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});

export const sendApprovalEmail = async (
  to: string,
  studentName: string,
  username: string,
  password: string,
  departmentName?: string,
  approvalDate?: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:1420';
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Sirimk" <no-reply@yourdomain.com>',
    to: to,
    subject: '✅ ການສະໝັກເຂົ້າຮຽນໄດ້ຮັບການອະນຸມັດ - ຂໍ້ມູນເຂົ້າສູ່ລະບົບ',
    html: `
<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body, #bodyTable { margin:0; padding:0; width:100%!important; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
    
    @media only screen and (max-width:480px) {
      .email-container { width:100%!important; }
      .fluid { width:100%!important; display:block!important; }
      .fluid-cell { display:block!important; width:100%!important; padding:6px 0!important; }
      .h1-mobile { font-size:22px!important; }
      .h2-mobile { font-size:14px!important; }
      .p-mobile { font-size:14px!important; }
      .credential { font-size:15px!important; padding:10px!important; }
      .label-mobile { font-size:13px!important; }
      .table-mobile { width:100%!important; }
      .table-mobile td { display:block!important; width:100%!important; padding:4px 0!important; }
      .padding-mobile { padding-left:15px!important; padding-right:15px!important; }
    }
    
    @media only screen and (max-width:360px) {
      .h1-mobile { font-size:20px!important; }
      .credential { font-size:14px!important; }
      .p-mobile { font-size:13px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;">
          
          <tr>
            <td style="background:linear-gradient(135deg, #2196F3 0%, #4CAF50 100%); padding:30px 20px; text-align:center; border-radius:12px 12px 0 0; background-color:#2196F3;" class="padding-mobile">
              <h1 class="h1-mobile" style="color:#ffffff; margin:0; font-size:28px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">✅ ຍິນດີນຳ!</h1>
              <p class="h2-mobile" style="color:#ffffff; margin:10px 0 0 0; font-size:16px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">ການສະໝັກເຂົ້າຮຽນໄດ້ຮັບການອະນຸມັດແລ້ວ</p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color:#ffffff; padding:30px 20px; border:1px solid #e5e7eb; border-top:none;" class="padding-mobile">
              <p class="p-mobile" style="font-size:16px; color:#374151; margin:0 0 20px 0; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif; line-height:1.6;">
                ສະບາຍດີ <strong>${studentName}</strong>,
              </p>
              
              <p class="p-mobile" style="font-size:15px; color:#374151; line-height:1.6; margin:0 0 20px 0; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                ຄຳຮ້ອງເຂົ້າຮຽນຂອງທ່ານໄດ້ຮັບການ<strong style="color:#047857;"> ອະນຸມັດ</strong> ແລ້ວ. 
                ທ່ານສາມາດເຂົ້າສູ່ລະບົບໄດ້ດ້ວຍຂໍ້ມູນດັ່ງນີ້:
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f9ff; border:2px solid #0ea5e9; border-radius:8px; margin:20px 0;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="margin:0 0 15px 0; color:#0369a1; font-size:18px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">🔑 ຂໍ້ມູນເຂົ້າສູ່ລະບົບ</h3>
                    
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:10px 0;">
                          <label class="label-mobile" style="display:block; font-size:14px; color:#64748b; margin-bottom:5px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">ຊື່ຜູ້ໃຊ້ (Username)</label>
                          <div class="credential" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:12px; font-size:18px; font-weight:bold; color:#0f172a; font-family:'Courier New',monospace; word-wrap:break-word; text-align:center;">
                            ${username}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <label class="label-mobile" style="display:block; font-size:14px; color:#64748b; margin-bottom:5px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">ລະຫັດຜ່ານ (Password)</label>
                          <div class="credential" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:12px; font-size:18px; font-weight:bold; color:#0f172a; font-family:'Courier New',monospace; word-wrap:break-word; text-align:center;">
                            ${password}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin:20px 0;">
                <tr>
                  <td style="padding:16px;">
                    <h4 style="margin:0 0 12px 0; color:#0f172a; font-size:16px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">📋 ຂໍ້ມູນເພີ່ມເຕີມ</h4>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr class="table-mobile">
                        <td class="label-mobile" style="padding:8px 0; color:#64748b; width:140px; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">📅 <strong>ວັນທີອະນຸມັດ:</strong></td>
                        <td class="label-mobile" style="padding:8px 0; color:#0f172a; font-weight:500; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">${approvalDate || 'ບໍ່ມີຂໍ້ມູນ'}</td>
                      </tr>
                      <tr class="table-mobile">
                        <td class="label-mobile" style="padding:8px 0; color:#64748b; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">🎓 <strong>ສາຂາ:</strong></td>
                        <td class="label-mobile" style="padding:8px 0; color:#0f172a; font-weight:500; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">${departmentName || 'ທົ່ວໄປ'}</td>
                      </tr>
                      <tr class="table-mobile">
                        <td class="label-mobile" style="padding:8px 0; color:#64748b; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">🌐 <strong>ເຂົ້າສູ່ລະບົບ:</strong></td>
                        <td class="label-mobile" style="padding:8px 0; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                          <a href="${frontendUrl}/login" style="color:#2196F3; text-decoration:none; font-weight:600; word-break:break-all;">
                            ${frontendUrl}/login
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef3c7; border-left:4px solid #f59e0b; margin:20px 0; border-radius:4px;">
                <tr>
                  <td style="padding:15px;">
                    <p class="p-mobile" style="margin:0; font-size:14px; color:#92400e; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                      <strong>⚠️ ຂໍ້ແນະນຳ:</strong>
                    </p>
                    <ul class="p-mobile" style="margin:10px 0 0 0; padding-left:20px; font-size:14px; color:#92400e; line-height:1.6; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                      <li>ກະລຸນາປ່ຽນລະຫັດຜ່ານຫຼັງຈາກເຂົ້າສູ່ລະບົບຄັ້ງທຳອິດ</li>
                      <li>ຢ່າແບ່ງປັນຂໍ້ມູນເຂົ້າສູ່ລະບົບກັບຜູ້ອື່ນ</li>
                      <li>ຖ້າມີບັນຫາ, ກະລຸນາຕິດຕໍ່ເຈົ້າໜ້າທີ່</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p class="p-mobile" style="font-size:15px; color:#374151; line-height:1.6; margin:20px 0 0 0; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                ຂອບໃຈທີ່ສົນໃຈເຂົ້າຮຽນກັບພວກເຮົາ.<br/>
                <strong style="color:#047857;">ທີມງານບໍລິຫານ</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color:#f9fafb; padding:20px; text-align:center; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none;" class="padding-mobile">
              <p style="margin:0; font-size:12px; color:#6b7280; font-family:'Phetsarath OT','Noto Sans Lao',Arial,sans-serif;">
                ອີເມວນີ້ຖືກສົ່ງອັດຕະໂນມັດ, ກະລຸນາຢ່າຕອບກັບ.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
ຍິນດີນຳ! ການສະໝັກເຂົ້າຮຽນໄດ້ຮັບການອະນຸມັດແລ້ວ

ສະບາຍດີ ${studentName},

ຄຳຮ້ອງເຂົ້າຮຽນຂອງທ່ານໄດ້ຮັບການອະນຸມັດແລ້ວ.
ທ່ານສາມາດເຂົ້າສູ່ລະບົບໄດ້ດ້ວຍຂໍ້ມູນດັ່ງນີ້:

ຊື່ຜູ້ໃຊ້ (Username): ${username}
ລະຫັດຜ່ານ (Password): ${password}

ຂໍ້ມູນເພີ່ມເຕີມ:
📅 ວັນທີອະນຸມັດ: ${approvalDate || 'ບໍ່ມີຂໍ້ມູນ'}
🎓 ສາຂາ: ${departmentName || 'ທົ່ວໄປ'}
🌐 ເຂົ້າສູ່ລະບົບ: ${frontendUrl}/login

ຂໍ້ແນະນຳ:
- ກະລຸນາປ່ຽນລະຫັດຜ່ານຫຼັງຈາກເຂົ້າສູ່ລະບົບຄັ້ງທຳອິດ
- ຢ່າແບ່ງປັນຂໍ້ມູນເຂົ້າສູ່ລະບົບກັບຜູ້ອື່ນ
- ຖ້າມີບັນຫາ, ກະລຸນາຕິດຕໍ່ເຈົ້າໜ້າທີ່

ຂອບໃຈ!
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email Send Error:', error);
    throw error;
  }
};

export default transporter;
