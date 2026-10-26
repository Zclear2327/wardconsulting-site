/* Weekly sign-up switch for the free setup (launch hardening v6, item H).
   mode "open" runs the setup flow; mode "waitlist" shows the waitlist form instead.
   weeklyCap is a NOTE ONLY: a static site can't count sign-ups, so flip mode yourself when the week is full.
   nextCohort is the date shown on the waitlist, for example "Monday, Nov 2". */
var CAPACITY = { mode: "waitlist" /* "open" | "waitlist" */, weeklyCap: 0 /* 0 = no cap */, nextCohort: "" /* e.g. "Monday, Nov 2" */ };
