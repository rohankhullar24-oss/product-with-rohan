package online.productwithrohan.smssorter.core

import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

private val IST: ZoneId = ZoneId.of("Asia/Kolkata")
private fun ts(y: Int, m: Int, d: Int) = LocalDate.of(y, m, d).atStartOfDay(IST).plusHours(12).toInstant().toEpochMilli()
private fun sms(address: String, body: String, at: Long = ts(2026, 11, 1), id: Long = 1, thread: Long = 1) =
    Sms(id, thread, address, body, at)

private const val SALARY = "Dear Customer, INR 4,69,530.00 credited to your A/c No XX0251 on 31/10/2026 through NEFT " +
    "with UTR IN42630450757857 by VALUEDRIVE TECHNOLOGIES LIMITED FORMERLY KNOWN AS, INFO: BATCHID:0037 SALARY-SBI"
private const val TDS = "Total TDS by Employer of PAN EJEXXXX6Q for Qtr ending Sep 30 is Rs 26,010 and cumulative TDS " +
    "for TY 26-27 is Rs 26,010. View Form 26AS/ATS for details. ITD Team."

class ClassifierTest {
    @Test fun phoneNumbersArePersonal() {
        assertEquals(Category.PERSONAL, Classifier.classify("+917208827563", "FkZCj3rzTP5cOIVw0vgevEoiY1eyIn"))
        assertEquals(Category.PERSONAL, Classifier.classify("98765 43210", "In an meeting"))
    }

    @Test fun traiSuffixDecides() {
        assertEquals(Category.TRANSACTIONS, Classifier.classify("VM-ITDCPC-G", TDS))
        assertEquals(Category.TRANSACTIONS, Classifier.classify("AD-SBIPSG-S", SALARY))
        assertEquals(Category.PROMOTIONS, Classifier.classify("TX-KOTAKB-P", "Hi Rohan, found a deal worth grabbing"))
        assertEquals(Category.PROMOTIONS, Classifier.classify("JK-TOYOTA-P", "Thank you for your interest in Toyota"))
    }

    @Test fun legacyHeadersFallBackToText() {
        assertEquals(Category.TRANSACTIONS, Classifier.classify("AD-HDFCBK", "123456 is your OTP for login. Do not share."))
        assertEquals(Category.PROMOTIONS, Classifier.classify("AD-SNITCH", "QUICK DROP: Black Friday 50% OFF on everything. Shop now!"))
    }
}

class ParserTest {
    @Test fun salaryCredit() {
        val t = assertNotNull(TransactionParser.parse(SALARY))
        assertEquals(469530.0, t.amount)
        assertEquals(TxnType.CREDIT, t.type)
        assertEquals("XX0251", t.account)
        assertEquals("VALUEDRIVE TECHNOLOGIES LIMITED FORMERLY KNOWN AS", t.counterparty)
    }

    @Test fun upiDebit() {
        val t = assertNotNull(TransactionParser.parse("Rs.250.00 debited from A/c XX1234 on 27-11-26 to SWIGGY via UPI Ref 6331. Avl Bal Rs 1,000"))
        assertEquals(250.0, t.amount)
        assertEquals(TxnType.DEBIT, t.type)
        assertEquals("XX1234", t.account)
        assertEquals("SWIGGY", t.counterparty)
    }

    @Test fun notTransactions() {
        assertNull(TransactionParser.parse(TDS))
        assertNull(TransactionParser.parse("OTP 4821 for txn of Rs 500 on your card. Amount will be debited after approval."))
    }

    @Test fun otp() {
        assertEquals("482913", OtpParser.find("482913 is your OTP to log in to Zomato. Valid for 10 min."))
        assertEquals("7781", OtpParser.find("Your verification code is 7781"))
        assertNull(OtpParser.find(SALARY))
    }

    @Test fun dates() {
        val ref = LocalDate.of(2026, 11, 20)
        fun first(s: String) = DateParser.findAll(s, ref).first().date
        assertEquals(LocalDate.of(2026, 12, 13), first("due on 13-Dec-2026"))
        assertEquals(LocalDate.of(2026, 12, 13), first("due by 13 Dec"))
        assertEquals(LocalDate.of(2026, 11, 12), first("DOJ:12-11-26"))
        assertEquals(LocalDate.of(2026, 12, 3), first("pay by Dec 3, 2026"))
        assertEquals(LocalDate.of(2027, 1, 5), DateParser.findAll("due 05 Jan", LocalDate.of(2026, 12, 28)).first().date)
    }
}

class ReminderTest {
    @Test fun airtelBill() {
        val r = assertNotNull(ReminderParser.parse(
            sms("AD-AIRTEL-S", "Your Airtel postpaid bill of Rs 11,006 for mobile no 98XXXX6000 is due on 13-Dec-2026. Pay now: airtel.in/pay", ts(2026, 11, 28)),
            IST,
        ))
        assertEquals(ReminderKind.PHONE, r.kind)
        assertEquals("AIRTEL", r.title)
        assertEquals("6000", r.subtitle)
        assertEquals(11006.0, r.amount)
        assertEquals(LocalDate.of(2026, 12, 13), r.date)
    }

    @Test fun cardBill() {
        val r = assertNotNull(ReminderParser.parse(
            sms("JD-ICICIT-S", "ICICI Bank Credit Card XX6000 statement: Total Amt Due Rs 8,450.20, Min Amt Due Rs 430. Due date 13-Oct-26.", ts(2026, 9, 25)),
            IST,
        ))
        assertEquals(ReminderKind.CARD, r.kind)
        assertEquals("ICICI", r.title)
        assertEquals("XX6000", r.subtitle)
        assertEquals(8450.20, r.amount)
        assertEquals(LocalDate.of(2026, 10, 13), r.date)
    }

    @Test fun paymentConfirmationIsNotAReminder() {
        assertNull(ReminderParser.parse(sms("AD-AIRTEL-S", "Payment of Rs 11,006 received for your bill due on 13-Dec-2026. Thank you!"), IST))
    }

    @Test fun irctcTicket() {
        val r = assertNotNull(ReminderParser.parse(
            sms("VM-IRCTCI-S", "PNR:2614458812,TRN:12192,DOJ:12-11-26,SL,JBP-NZM,DP:19:25,Boarding at JBP,Passenger 1:S4 32,Fare:575", ts(2026, 10, 30)),
            IST,
        ))
        assertEquals(ReminderKind.TRAIN, r.kind)
        assertEquals("JBP - NZM", r.title)
        assertEquals("12192", r.subtitle)
        assertEquals(LocalDate.of(2026, 11, 12), r.date)
    }

    @Test fun upcomingVsHistoryAndDedupe() {
        val msgs = listOf(
            sms("AD-AIRTEL-S", "Airtel bill of Rs 11,006 for 98XXXX6000 is due on 13-Dec-2026.", ts(2026, 11, 20), id = 1),
            sms("AD-AIRTEL-S", "Reminder: Airtel bill of Rs 11,006 for 98XXXX6000 is due on 13-Dec-2026.", ts(2026, 11, 27), id = 2),
            sms("VM-IRCTCI-S", "PNR:2614458812,TRN:12192,DOJ:12-11-26,SL,JBP-NZM", ts(2026, 10, 30), id = 3),
        )
        val r = Organizer.reminders(msgs, LocalDate.of(2026, 11, 28), zone = IST)
        assertEquals(listOf(2L), r.upcoming.map { it.sourceMessageId })
        assertEquals(listOf("JBP - NZM"), r.history.map { it.title })

        val paid = Organizer.reminders(msgs, LocalDate.of(2026, 11, 28), done = setOf(r.upcoming.first().key), zone = IST)
        assertEquals(0, paid.upcoming.size)
        assertEquals(2, paid.history.size)
    }
}

class DeleteTest {
    private val msgs = listOf(
        sms("VM-ITDCPC-G", TDS, id = 10, thread = 1),
        sms("VM-ITDCPC-G", TDS, id = 11, thread = 1),
        sms("AD-SBIPSG-S", SALARY, id = 20, thread = 2),
        sms("TX-KOTAKB-P", "deal", id = 30, thread = 3),
    )

    @Test fun starredMessagesSurviveConversationDelete() {
        val ids = Organizer.idsToDelete(msgs, threadIds = setOf(1, 2), starred = setOf(11, 20), includeStarred = false)
        assertEquals(listOf(10L), ids)
    }

    @Test fun toggleDeletesStarredToo() {
        val ids = Organizer.idsToDelete(msgs, threadIds = setOf(1, 2), starred = setOf(11, 20), includeStarred = true)
        assertEquals(listOf(10L, 11L, 20L), ids)
    }
}

class ConversationTest {
    @Test fun groupsByThreadNewestFirst() {
        val c = Organizer.conversations(listOf(
            Sms(1, 1, "VM-ITDCPC-G", TDS, ts(2026, 9, 13), read = true),
            Sms(2, 1, "VM-ITDCPC-G", TDS, ts(2026, 11, 25), read = false),
            Sms(3, 2, "+917208827563", "hi", ts(2026, 11, 26)),
        ))
        assertEquals(listOf(2L, 1L), c.map { it.threadId })
        assertEquals(Category.PERSONAL, c[0].category)
        assertEquals(1, c[1].unread)
        assertEquals(2, c[1].messageCount)
    }
}
