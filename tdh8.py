# Copyright 2012 Dan Smith <dsmith@danplanet.com>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import struct
import logging


from chirp import chirp_common, errors, util, directory, memmap
from chirp import bitwise
from chirp.settings import InvalidValueError, \
    RadioSettings, RadioSetting, RadioSettingGroup, \
    RadioSettingSubGroup, RadioSettingValueFloat, \
    RadioSettingValueInteger, RadioSettingValueBoolean, \
    RadioSettingValueString, RadioSettingValueList, \
    RadioSettingValueMap
from textwrap import dedent
from chirp import bandplan_na

LOG = logging.getLogger(__name__)

MEM_FORMAT = """
// TD-H8
#seekto 0x0008;
struct {
  lbcd rxfreq[4];
  lbcd txfreq[4];
  lbcd rxtone[2];
  lbcd txtone[2];
  u8 unused1;
  u8 pttid:2,
     freqhop:1,
     unused3:1,
     unused4:1,
     bcl:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused7:1,
     lowpower:2,
     wide:1,
     unused8:1,
     offset:2;
  u8 unused10;
} memory[200];

#seekto 0x0CA8;
struct {
  u8 txled:1,
     rxled:1,
     unused11:1,
     ham:1,
     gmrs:1,
     unused14:1,
     dtmfst:1,
     pritx:1;
  u8 scanmode:2,
     unused16:1,
     keyautolock:1,
     unused17:1,
     btnvoice:1,
     unknown18:1,
     voiceprompt:1;
  u8 fmworkmode:1,
     sync:1,
     tonevoice:2,
     fmrec:1,
     mdfa:1,
     aworkmode:2;
  u8 ponmsg:2,
     unused19:1,
     mdfb:1,
     unused20:1,
     dbrx:1,
     bworkmode:2;
  u8 ablock;
  u8 bblock;
  u8 fmroad;
  u8 unused21:1,
     tailclean:1,
     rogerprompt:1,
     unused23:1,
     unused24:1,
     voxgain:3;
  u8 astep:4,
     bstep:4;
  u8 squelch;
  u8 tot;
  u8 lang;
  u8 save;
  u8 ligcon;
  u8 voxdelay;
  u8 onlychmode:1,
     breathled:3,
     unused:3,
     alarm:1;
} settings;

//#seekto 0x0CB8;
struct {
    u8 ofseta[4];
} aoffset;

//#seekto 0x0CBC;
struct {
    u8 ofsetb[4];
} boffset;

#seekto 0x0CD8;
struct{
    lbcd fmblock[4];
}fmmode[25];

#seekto 0x0D48;
struct {
  char name[8];
  u8 unknown2[8];
} names[200];

#seekto 0x1A08;
lbit usedflags[200];

#seekto 0x1a28;
lbit scanadd[200];

#seekto 0x1B38;
lbcd fmvfo[4];

#seekto 0x1B58;
struct {
  lbcd rxfreqa[4];
  lbcd txfreqa[4];
  u8 rxtone[2];
  u8 txtone[2];
  u8 unused1;
  u8 pttid:2,
     freqhop:1,
     unused3:1,
     unused4:1,
     bcl:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused7:1,
     lowpower:2,
     wide:1,
     unused8:1,
     offset:2;
  u8 unused10;
} vfoa;

//#seekto 0x1B68;
struct {
  lbcd rxfreqb[4];
  lbcd txfreqb[4];
  u8 rxtoneb[2];
  u8 txtoneb[2];
  u8 unused1;
  u8 pttidb:2,
     freqhopb:1,
     unused3:1,
     unused4:1,
     bclb:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused7:1,
     lowpowerb:2,
     wideb:1,
     unused8:1,
     offsetb:2;
  u8 unused10;
} vfob;

//#seekto 0x1B78;
lbit fmusedflags[32];

#seekto 0x1c08;
struct {
  char msg1[16];
  char msg2[16];
  char msg3[16];
} poweron_msg;

#seekto 0x1CC8;
struct{
  u8 stopkey1;
  u8 ssidekey1;
  u8 ssidekey2;
  u8 ltopkey2;
  u8 lsidekey3;
  u8 lsidekey4;
  u8 unused25[10];
} press;

#seekto 0x1E28;
struct{
    u8 idcode[3];
}icode;

#seekto 0x1E31;
struct{
    u8 gcode;
}groupcode;

#seekto 0x1E38;
struct{
    u8 group1[16];
}group1;

//#seekto 0x1E48;
struct{
    u8 group2[16];
}group2;

//#seekto 0x1E58;
struct{
    u8 group3[16];
}group3;

//#seekto 0x1E68;
struct{
    u8 group4[16];
}group4;

//#seekto 0x1E78;
struct{
    u8 group5[16];
}group5;

//#seekto 0x1E88;
struct{
    u8 group6[16];
}group6;

//#seekto 0x1E98;
struct{
    u8 group7[16];
}group7;

//#seekto 0x1EA8;
struct{
    u8 group8[16];
}group8;

#seekto 0x1EC8;
struct{
    u8 scode[16];
}startcode;

//#seekto 0x1ED8;
struct{
    u8 ecode[16];
}endcode;

#seekto 0x1f0a;
struct{
  u8 rpste;
  u8 rptrl;
} rpt;

#seekto 0x1f28;
struct{
  u8 micgain;
} mic;

#seekto 0x1f38;
struct{
  u8 unused1:7,
     btstatus:1;
} bluetooth;

#seekto 0x1f58;
struct{
  u8 low136;
  u8 low140;
  u8 low150;
  u8 low160;
  u8 low170;
  u8 low400;
  u8 low410;
  u8 low420;
  u8 low430;
  u8 low440;
  u8 low450;
  u8 low460;
  u8 low470;
  u8 low245;
  u8 unusedlow[2];
  u8 mid136;
  u8 mid140;
  u8 mid150;
  u8 mid160;
  u8 mid170;
  u8 mid400;
  u8 mid410;
  u8 mid420;
  u8 mid430;
  u8 mid440;
  u8 mid450;
  u8 mid460;
  u8 mid470;
  u8 mid245;
  u8 unusedmid[2];
  u8 hig136;
  u8 hig140;
  u8 hig150;
  u8 hig160;
  u8 hig170;
  u8 hig400;
  u8 hig410;
  u8 hig420;
  u8 hig430;
  u8 hig440;
  u8 hig450;
  u8 hig460;
  u8 hig470;
  u8 hig245;
  u8 unusedhig[2];
} powertune;

"""


MEM_FORMAT_H3 = """
// TD-H3, TD-H3 Plus
#seekto 0x0008;
struct {
  lbcd rxfreq[4];
  lbcd txfreq[4];
  lbcd rxtone[2];
  lbcd txtone[2];
  u8 scramble;
  u8 pttid:2,
     freqhop:1,
     unused3:1,
     unused4:1,
     bcl:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused1:1,
     lowpower:2,
     wide:1,
     unused8:1,
     offset:2;
  u8 unused10;
} memory[200];

#seekto 0x0C98;
struct{
  u8 stopkey1;
  u8 ssidekey1;
  u8 ssidekey2;
  u8 ltopkey2;
  u8 lsidekey3;
  u8 lsidekey4;
} press;

#seekto 0x0CA0;
struct {
  u8 unknown21:7,
     dtmfdecode:1;
  u8 unknown22:6,
     dtmfautorst:2;
  u8 unknown23:6,
     dtmfdecoderesp:2;
  u8 unknown24:5,
     dtmfspeed:3;
  u8 unknown25:4,
     scanband:4;
  u8 brightness:8;
  u8 unknown27:8;
  u8 unknown28:8;
  u8 txled:1,
     rxled:1,
     unused11:1,
     ham:1,
     gmrs:1,
     unused14:1,
     dtmfst:1,
     pritx:1;
  u8 scanmode:2,
     unused16:1,
     keyautolock:1,
     unused17:1,
     btnvoice:1,
     unknown18:1,
     voiceprompt:1;
  u8 fmworkmode:1,
     sync:1,
     tonevoice:2,
     fmrec:1,
     mdfa:1,
     aworkmode:2;
  u8 ponmsg:2,
     unused19:1,
     mdfb:1,
     unused20:1,
     dbrx:1,
     bworkmode:2;
  u8 ablock;
  u8 bblock;
  u8 fmroad;
  u8 unused21:1,
     tailclean:1,
     rogerprompt_:1,
     kill:1,
     stun:1,
     voxgain:3;
  u8 astep:4,
     bstep:4;
  u8 squelch;
  u8 tot;
  u8 rogerprompt:2,
     unused11_4:1,
     tx220:1,
     tx350:1,
     tx500:1,
     lang:1,
     unused11_1:1;
  u8 save;
  u8 ligcon;
  u8 voxdelay;
  u8 onlychmode:1,
     breathled:3,
     unused:2,
     amband:1,
     alarm:1;
} settings;

//#seekto 0x0CB8;
struct {
    u8 ofseta[4];
} aoffset;

//#seekto 0x0CBC;
struct {
    u8 ofsetb[4];
} boffset;

#seekto 0x0CD8;
struct{
    lbcd fmblock[4];
}fmmode[25];

#seekto 0x0D48;
struct {
  char name[8];
} names[200];

#seekto 0x1808;
struct{
    u8 stuncode[16];
    u8 killcode[16];
}skcode;

//#seekto 0x1828;
struct{
    u8 idcode[3];
}icode;

#seekto 0x1831;
struct{
    u8 gcode;
}groupcode;

#seekto 0x1838;
struct{
    u8 group1[16];
}group1;

// #seekto 0x1848;
struct{
    u8 group2[16];
}group2;

// #seekto 0x1858;
struct{
    u8 group3[16];
}group3;

// #seekto 0x1868;
struct{
    u8 group4[16];
}group4;

// #seekto 0x1878;
struct{
    u8 group5[16];
}group5;

// #seekto 0x1888;
struct{
    u8 group6[16];
}group6;

// #seekto 0x1898;
struct{
    u8 group7[16];
}group7;

// #seekto 0x18A8;
struct{
    u8 group8[16];
}group8;

#seekto 0x18C8;
struct{
    u8 scode[16];
}startcode;

//#seekto 0x18D8;
struct{
    u8 ecode[16];
}endcode;

#seekto 0x1908;
lbit usedflags[200];

#seekto 0x1928;
lbit scanadd[200];

#seekto 0x1948;
lbit fmusedflags[32];

#seekto 0x1958;
struct {
  lbcd rxfreqa[4];
  lbcd txfreqa[4];
  u8 rxtone[2];
  u8 txtone[2];
  u8 scramble;
  u8 pttid:2,
     freqhop:1,
     unused3:1,
     unused4:1,
     bcl:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused7:1,
     lowpower:2,
     wide:1,
     unused8:1,
     offset:2;
  u8 unused10;
} vfoa;

//#seekto 0x1968;
struct {
  lbcd rxfreqb[4];
  lbcd txfreqb[4];
  u8 rxtoneb[2];
  u8 txtoneb[2];
  u8 scrambleb;
  u8 pttidb:2,
     freqhopb:1,
     unused3:1,
     unused4:1,
     bclb:1,
     unused5:1,
     unused2:1;
  u8 unused6:1,
     unused7:1,
     lowpowerb:2,
     wideb:1,
     unused8:1,
     offsetb:2;
  u8 unused10;
} vfob;

//#seekto 0x1978;
lbcd fmvfo[4];

#seekto 0x1c08;
struct {
  char msg1[16];
  char msg2[16];
  char msg3[16];
} poweron_msg;

#seekto 0x1f0a;
struct{
  u8 rpste;
  u8 rptrl;
} rpt;

#seekto 0x1f28;
struct{
  u8 micgain;
} mic;

#seekto 0x1f38;
struct{
  u8 unused1:7,
     btstatus:1;
} bluetooth;

#seekto 0x1f58;
struct{
  u8 low136;
  u8 low140;
  u8 low150;
  u8 low160;
  u8 low170;
  u8 low400;
  u8 low410;
  u8 low420;
  u8 low430;
  u8 low440;
  u8 low450;
  u8 low460;
  u8 low470;
  u8 low245;
  u8 unusedlow[2];
  u8 unusedmid[16];
  u8 hig136;
  u8 hig140;
  u8 hig150;
  u8 hig160;
  u8 hig170;
  u8 hig400;
  u8 hig410;
  u8 hig420;
  u8 hig430;
  u8 hig440;
  u8 hig450;
  u8 hig460;
  u8 hig470;
  u8 hig245;
  u8 unusedhig[2];
} powertune;

"""

MEM_FORMAT_RT730 = """
// RT-730
#seekto 0x0008;
struct {
  lbcd rxfreq[4];
  lbcd txfreq[4];
  lbcd rxtone[2];
  lbcd txtone[2];
  u8 unused1;
  u8 unused2:4,
     spec:1,
     bcl:1,
     unused3:2;
  u8 scramble:1,
     freqhop:1,
     lowpower:2,
     wide:1,
     unused4:3;
  u8 unused5;
} memory[200];

#seekto 0x0C98;
struct{
  u8 ssidekey1;
  u8 lsidekey1;
  u8 ssidekey2;
  u8 lsidekey2;
  u8 unused1:6,
     rogerprompt:2;
} press;

#seekto 0x0CA8;
struct {
  u8 txled:1,
     rxled:1,
     unused1:6;
  u8 scanmode:2,
     unused2:1,
     keyautolock:1,
     save:1,
     btnvoice:1,
     unused3:1,
     voiceprompt:1;
  u8 fmworkmode:1,
     ligcon:2,
     unused4:1,
     fmrec:1,
     mdfa:1,
     aworkmode:2;
  u8 unused5:5,
     dbrx:1,
     bworkmode:2;
  u8 unused6;
  u8 unused7;
  u8 fmroad;
  u8 unused8:1,
     tailclean:1,
     unused9:3,
     voxgain:3;
  u8 astep:4,
     bstep:4;
  u8 squelch;
  u8 tot;
  u8 unused10:6,
     lang:1,
     unused11:1;
  u8 unused12;
  u8 unused13;
  u8 voxdelay;
  u8 unused14:6,
     hoptype:2;
} settings;

//#seekto 0x0CB8;
struct {
    u8 ofseta[4];
} aoffset;

//#seekto 0x0CBC;
struct {
    u8 ofsetb[4];
} boffset;

#seekto 0x0CD8;
struct{
    lbcd fmblock[4];
}fmmode[25];

#seekto 0x0D48;
struct {
  char name[8];
} names[200];

#seekto 0x1398;
struct {
  char msg1[16];
  char msg2[16];
  char msg3[16];
  char msg4[16];
} poweron_msg;

#seekto 0x1A08;
lbit usedflags[200];

#seekto 0x1A28;
lbit scanadd[200];

#seekto 0x1B38;
lbcd fmvfo[4];

#seekto 0x1B58;
struct {
  lbcd rxfreqa[4];
  lbcd txfreqa[4];
  u8 rxtone[2];
  u8 txtone[2];
  u8 unused1;
  u8 pttid:2,
     specialqta:1,
     unused2:1,
     unused3:1,
     bcl:1,
     unused4:1,
     unused5:1;
  u8 unused6:1,
     unused7:1,
     lowpower:2,
     wide:1,
     unused8:1,
     offset:2;
  u8 unused9;
} vfoa;

//#seekto 0x1B68;
struct {
  lbcd rxfreqb[4];
  lbcd txfreqb[4];
  u8 rxtoneb[2];
  u8 txtoneb[2];
  u8 unused1;
  u8 pttid:2,
     specialqtb:1,
     unused2:1,
     unused3:1,
     bclb:1,
     unused4:1,
     unused5:1;
  u8 unused6:1,
     unused7:1,
     lowpowerb:2,
     wideb:1,
     unused8:1,
     offsetb:2;
  u8 unused9;
} vfob;

//#seekto 0x1B78;
lbit fmusedflags[32];

#seekto 0x1f28;
struct{
  u8 micgain;
} mic;

"""

# basic settings
SQUELCH = ['%s' % x for x in range(0, 10)]
LIGHT_LIST = ["CONT", "5s", "10s", "15s", "30s"]
LIGHT730_LIST = ["CONT", "10s", "20s", "30s"]
MDFA_LIST = ["Frequency", "Name"]
MDFB_LIST = ["Frequency", "Name"]
HOP_LIST = ["A", "B", "C", "D"]
SCAN_MODE_LIST = ["TO", "CO", "SE"]
PRIO_LIST = ["Edit", "Busy"]
SHORT_KEY_LIST = ["None", "FM Radio", "Lamp", "Monitor",
                  "TONE", "Alarm", "Weather"]
LONG_KEY_LIST = ["None", "FM Radio", "Lamp",
                 "Monitor", "TONE", "Alarm", "Weather"]
SHORT_KEY730_LIST = ["None", "Scan", "FM", "Warn", "TONE", "Weather",
                     "Copy CH"]
LONG_KEY730_LIST = SHORT_KEY730_LIST + ["Monitor"]
PRESS_NAME = ["stopkey1", "ssidekey1", "ssidekey2",
              "ltopkey2", "lsidekey3", "lsidekey4"]

VFOA_NAME = ["rxfreqa",
             "txfreqa",
             #  "rxtone",
             #  "txtone",
             "scramble",
             "pttid",
             "freqhop",
             "bcl",
             "lowpower",
             "wide",
             "offset"]

VFOB_NAME = ["rxfreqb",
             "txfreqb",
             #  "rxtoneb",
             #  "txtoneb",
             "scrambleb",
             "pttidb",
             "freqhopb",
             "bclb",
             "lowpowerb",
             "wideb",
             "offsetb"]

TOT_LIST = ["Off", "30S", "60S", "90S", "120S", "150S", "180S", "210S"]
ALARM_LIST = ["On site", "Alarm"]

DTMF_AUTO_RESET_LIST = ["Off", "5S", "10S", "15S"]
DTMF_DECODING_RESPONSE_LIST = ["NULL", "RING", "REPLY", "BOTH"]
DTMF_SPEED_LIST = ["80ms",
                   "90ms",
                   "100ms",
                   "110ms",
                   "120ms",
                   "130ms",
                   "140ms",
                   "150ms"]
SCAN_BAND_LIST = ["All",
                  "0.5M",
                  "1.0M",
                  "1.5M",
                  "2.0M",
                  "2.5M",
                  "3.0M",
                  "3.5M",
                  "4.0M",
                  "4.5M",
                  "5.0M"]

# KEY
VOX_GAIN = ["Off", "1", "2", "3", "4", "5"]
VOX_DELAY = ["1.05s", "2.0s", "3.0s"]
VOX_GAIN730 = ["Off", "1", "2", "3"]
VOX_DELAY730 = ["0.5s", "1.0s", "2.0s", "3.0s"]
PTTID_VALUES = ["Off", "BOT", "EOT", "BOTH"]
BCLOCK_VALUES = ["Off", "On"]
FREQHOP_VALUES = ["Off", "On"]

# AB CHANNEL
A_OFFSET = ["Off", "-", "+"]
A_BAND = ["Wide", "Narrow"]
A_WORKMODE = ["VFO", "VFO+CH", "CH Mode"]

B_OFFSET = ["Off", "-", "+"]
B_BAND = ["Wide", "Narrow"]
B_WORKMODE = ["VFO", "VFO+CH", "CH Mode"]

# FM
FM_WORKMODE = ["VFO", "CH"]
FM_CHANNEL = ['%s' % x for x in range(0, 26)]

# DTMF
GROUPCODE_MAP = [("", 0x00), ("Off", 0xff), ("*", 0x0e), ("#", 0x0f),
                 ("A", 0x0a), ("B", 0x0b), ("C", 0x0c), ("D", 0x0d)]

AB_LIST = ["A", "B"]
BANDWIDTH_LIST = ["Wide", "Narrow"]
PTTID_LIST = ["Off", "BOT", "EOT", "Both"]
RTONE_LIST = ["1000 Hz", "1450 Hz", "1750 Hz", "2100 Hz"]
SCODE_LIST = ["%s" % x for x in range(1, 16)]
TIMEOUT730_LIST = ["Off"] + ["%s sec" % x for x in range(30, 240, 30)]
H8_LIST = ["TD-H8", "TD-H8-HAM", "TD-H8-GMRS"]
H3_LIST = ["TD-H3", "TD-H3-HAM", "TD-H3-GMRS"]
H3_PLUS_LIST = ["TD-H3-Plus", "TD-H3-Plus-HAM", "TD-H3-Plus-GMRS"]
RADIO_MODE_LIST = ["HAM", "GMRS", "NORMAL"]

GMRS_FREQS = bandplan_na.ALL_GMRS_FREQS

NOAA_FREQS = [162550000, 162400000, 162475000, 162425000, 162450000,
              162500000, 162525000, 161650000, 161775000, 161750000,
              162000000]

HAM_GMRS_NAME = ["NOAA 1", "NOAA 2", "NOAA 3", "NOAA 4", "NOAA 5", "NOAA 6",
                 "NOAA 7", "NOAA 8", "NOAA 9", "NOAA 10", "NOAA 11"]

ALL_MODEL = H8_LIST + H3_LIST + H3_PLUS_LIST + ["RT-730"]

TD_H8 = b"\x50\x56\x4F\x4A\x48\x1C\x14"
TD_H3 = b"\x50\x56\x4F\x4A\x48\x5C\x14"
TD_H3_PLUS = TD_H3
RT_730 = b"\x50\x47\x4F\x4A\x48\xC3\x44"


def _do_status(radio, block):
    status = chirp_common.Status()
    status.msg = "Cloning"
    status.cur = block
    status.max = radio._memsize
    radio.status_fn(status)


def _upper_band_from_data(data):
    return data[0x03:0x04]


def _upper_band_from_image(radio):
    return _upper_band_from_data(radio.get_mmap())


def _firmware_version_from_data(data, version_start, version_stop):
    version_tag = data[version_start:version_stop]
    return version_tag


def _firmware_version_from_image(radio):
    version = _firmware_version_from_data(radio.get_mmap(),
                                          radio._fw_ver_file_start,
                                          radio._fw_ver_file_stop)
    # LOG.debug("_firmware_version_from_image: " + util.hexprint(version))
    return version


def _do_ident(serial, magic, secondack=True):
    serial.timeout = 1

    LOG.info("Sending Magic: %s" % util.hexprint(magic))
    serial.write(magic)
    ack = serial.read(1)

    if ack != b"\x06":
        if ack:
            # LOG.debug(repr(ack))
            pass
        raise errors.RadioError("Radio did not respond")

    serial.write(b"\x02")

    response = b""
    for i in range(1, 9):
        byte = serial.read(1)
        response += byte
        if byte == b"\xDD":
            break

    if len(response) in [8, 12]:
        # DEBUG
        LOG.info("Valid response, got this:")
        LOG.info(util.hexprint(response))
        if len(response) == 12:
            ident = response[0] + response[3] + response[5] + response[7:]
        else:
            ident = response
    else:
        # bad response
        msg = "Unexpected response, got this:"
        msg += util.hexprint(response)
        LOG.debug(msg)
        raise errors.RadioError("Unexpected response from radio.")

    if secondack:
        serial.write(b"\x06")
        ack = serial.read(1)
        if ack != b"\x06":
            raise errors.RadioError("Radio refused clone")

    return ident


def response_mode(mode):
    data = mode
    return data


def _read_block(radio, start, size):
    serial = radio.pipe

    cmd = struct.pack(">cHb", b'R', start, size)
    expectedresponse = b"W" + cmd[1:]

    try:
        serial.write(cmd)
        response = serial.read(5 + size)
        if response[:4] != expectedresponse:
            raise errors.RadioError("Error reading block %04x." % (start))
        block_data = response[4:-1]

    except Exception:
        raise errors.RadioError("Failed to read block at %04x" % start)

    return block_data


def _get_radio_firmware_version(radio):
    if radio.MODEL in ALL_MODEL:
        block = _read_block(radio, 0x1B40, 0x20)
        version = block[0:6]
    return version


IDENT_BLACKLIST = {
    b"\x50\x56\x4F\x4A\x48\x1C\x14": "Radio identifies as TIDRADIO TD-H8",
}


def _do_download(radio):
    # Radio must have already been ident'd by detect_from_serial()
    data = radio.ident_mode
    # Main block
    LOG.info("Downloading...")

    for i in range(0, radio._memsize, 0x20):
        block = _read_block(radio, i, 0x20)
        data += block
        _do_status(radio, i)
    _do_status(radio, radio._memsize)
    LOG.info("done.")

    return memmap.MemoryMapBytes(data)


def _exit_write_block(radio):
    serial = radio.pipe
    try:
        serial.write(b"E")

    except Exception:
        raise errors.RadioError("Radio refused to exit programming mode")


def _write_block(radio, addr, data):
    serial = radio.pipe
    cmd = struct.pack(">cHb", b'W', addr, 0x20)
    data = radio.get_mmap()[addr + 8: addr + 40]
    # The checksum needs to be in the last
    check_sum = bytes([sum(data) & 0xFF])
    data += check_sum
    used_data = cmd + data
    serial.write(used_data)

    ack = radio.pipe.read(1)
    if ack != b"\x06":
        raise errors.RadioError("Radio refused to accept block 0x%04x" % addr)


def _do_upload(radio):
    data = _do_ident(radio.pipe, radio._idents[0])
    radio_version = _get_radio_firmware_version(radio)
    LOG.info("Radio Version is %s" % repr(radio_version))

    if radio.ident_mode == data:
        LOG.info("Successful match.")
    else:
        msg = ("Model mismatch!")
        raise errors.RadioError(msg)

    # Main block
    LOG.debug("Uploading...")

    for start_addr, end_addr in radio._ranges_main:
        for addr in range(start_addr, end_addr, 0x20):
            _write_block(radio, addr, 0x20)
            _do_status(radio, addr)
    _exit_write_block(radio)
    LOG.debug("Upload all done.")


TDH8_CHARSET = chirp_common.CHARSET_ALPHANUMERIC + \
    "!@#$%^&*()+-=[]:\";'<>?,./"


class radiomode:
    mode = -1


@directory.register
class TDH8(chirp_common.CloneModeRadio):
    """TIDRADIO TD-H8"""
    VENDOR = "TIDRADIO"
    MODEL = "TD-H8"
    ident_mode = b'P31183\xff\xff'
    BAUD_RATE = 38400
    MODES = ["FM", "NFM"]  # , "AM"] # TD-H8 dosn't have AM RX!
    # _memsize = 0x1eef
    # _ranges_main = [(0x0000, 0x1eef)]
    _memsize = 0x1fef
    _ranges_main = [(0x0000, 0x1fef)]
    _idents = [TD_H8]
    _txbands = [(136000000, 175000000), (400000000, 521000000)]
    _airband = []
    _rxbands = [] + _airband
    _aux_block = True
    _tri_power = True
    _gmrs = False
    _ham = False
    _mem_params = (0x1F2F)

    # offset of fw version in image file
    _fw_ver_file_start = 0x1838
    _fw_ver_file_stop = 0x1846
    _valid_chars = TDH8_CHARSET
    _tx_power = [chirp_common.PowerLevel("Low",  watts=1.00),
                 chirp_common.PowerLevel("Mid",  watts=4.00),
                 chirp_common.PowerLevel("High", watts=8.00)]
    _ponmsg_list = ["Off", "Msg", "Icon"]
    _breath_led_list = ["Off", "5S", "10S", "15S", "30S"]
    _save_list = ["Off", "1:1", "1:2", "1:3", "1:4", "1:8"]
    _steps = [2.5, 5.0, 6.25, 10.0, 12.5, 25.0, 50.0]
    _step_list = ['%2.2fK' % x for x in _steps]
    _lang_map = [("Chinese", 1), ("English", 3)]
    _save_shortname = "Power Save"
    _fmrec_shortname = "Allow Receive"
    _mic_gain_list = ['%02d' % x for x in range(0, 33)]
    _rpt_delay_list = ["Off"] + ['%s' % x for x in range(1, 11)]

    _code_list_ctcss = ["%2.1fHz" % x for x in sorted(chirp_common.TONES)]
    _code_list_ctcss.insert(0, "Off")
    _dcs = sorted(chirp_common.DTCS_CODES)
    _code_list_dcsn = ["%03iN" % x for x in _dcs]
    _code_list_dcsi = ["%03iI" % x for x in _dcs]
    _code_list = _code_list_ctcss + _code_list_dcsn + _code_list_dcsi

    # maps DTMF chars to binary vaules the radio uses
    _dtmf_code_map = [('0', 0x00), ('1', 0x01), ('2', 0x02), ('3', 0x03),
                      ('4', 0x04), ('5', 0x05), ('6', 0x06), ('7', 0x07),
                      ('8', 0x08), ('9', 0x09), ('A', 0x0a), ('B', 0x0b),
                      ('C', 0x0c), ('D', 0x0d), ('*', 0x0e), ('#', 0x0f)]

    @classmethod
    def detect_from_serial(cls, pipe):
        ident = _do_ident(pipe, cls._idents[0])
        for rclass in cls.detected_models():
            if rclass.ident_mode == ident:
                return rclass
        LOG.error('No model match found for %r', ident)
        raise errors.RadioError('Unsupported model')

    @classmethod
    def get_prompts(cls):
        rp = chirp_common.RadioPrompts()
        rp.pre_download = (dedent("""\
            1. Turn radio off.
            2. Connect cable to mic/spkr connector.
            3. Make sure connector is firmly connected.
            4. Turn radio on (volume may need to be set at 100%).
            5. Ensure that the radio is tuned to channel with no activity.
            6. Click OK to download image from device."""))
        rp.pre_upload = (dedent("""\
            1. Turn radio off.
            2. Connect cable to mic/spkr connector.
            3. Make sure connector is firmly connected.
            4. Turn radio on (volume may need to be set at 100%).
            5. Ensure that the radio is tuned to channel with no activity.
            6. Click OK to upload image to device."""))
        return rp

    def get_features(self):
        rf = chirp_common.RadioFeatures()
        rf.has_settings = True
        rf.has_bank = False
        rf.has_cross = True
        rf.has_ctone = True
        rf.has_rx_dtcs = True
        rf.has_tuning_step = False
        rf.has_ctone = True
        rf.can_odd_split = True
        rf.valid_name_length = 8
        rf.valid_characters = self._valid_chars
        rf.valid_skips = ["", "S"]
        rf.valid_tmodes = ["", "Tone", "TSQL", "DTCS", "Cross"]
        rf.valid_cross_modes = [
            "Tone->Tone",
            "DTCS->",
            "->DTCS",
            "Tone->DTCS",
            "DTCS->Tone",
            "->Tone",
            "DTCS->DTCS"]
        rf.valid_power_levels = [x for x in self._tx_power if x]
        rf.valid_duplexes = ["", "-", "+", "split", "off"]
        rf.valid_modes = self.MODES
        rf.valid_tuning_steps = self._steps

        rf.valid_bands = self._txbands + self._rxbands
        rf.valid_bands.sort()
        rf.memory_bounds = (1, 199)
        return rf

    def process_mmap(self):
        self._memobj = bitwise.parse(MEM_FORMAT, self._mmap)

    def sync_in(self):
        try:
            self._mmap = _do_download(self)
            self.process_mmap()
        except Exception as e:
            raise errors.RadioError("Failed to communicate with radio: %s" % e)

    def sync_out(self):
        try:
            _do_upload(self)
        except errors.RadioError:
            raise
        except Exception as e:
            raise errors.RadioError("Failed to communicate with radio: %s" % e)

    def get_raw_memory(self, number):
        return repr(self._memobj.memory[number])

    # Decoding processing
    def _decode_tone(self, val):
        if val == 16665 or val == 0:
            return '', None, None
        elif val >= 12000:
            return 'DTCS', val - 12000, 'R'
        elif val >= 8000:
            return 'DTCS', val - 8000, 'N'
        else:
            return 'Tone', val / 10.0, None

    # decode radio stored binary vfo tone code into human readable form
    def _decode_vfo_tone(self, code):
        if code[0] + (code[1] << 8) == 0xffff:  # Off
            tone = 'Off'
        elif 0x06 <= code[1] <= 0x25:  # CTCSS
            tone = '%2.1fHz' % (int(hex(code[1])[2:] +
                                    "%0.2d" % float(hex(code[0])[2:])) / 10)
        elif code[1] & 0x40:  # DCS inverse
            tone = hex(code[1] & ~0xc0)[2:] + hex(code[0])[2:] + 'I'
        elif code[1] & 0x80:  # DCS normal
            tone = hex(code[1] & ~0x80)[2:] + hex(code[0])[2:] + 'N'
        else:
            msg = "Invalid tone code from radio: %s" %  \
                hex(code[0] + (code[1] << 8))
            LOG.exception(msg)
            raise InvalidValueError(msg)

        return tone

    # decode the binary coded value into a DTMF char
    def _decode_dtmf(self, list_val, has_len_byte=False):
        val = ""
        len_val = 0
        x = 1 if has_len_byte else 0

        while len_val < (len(list_val) - x):
            if list_val[len_val] != 0xff:
                for e in self._dtmf_code_map:
                    if e[1] == list_val[len_val]:
                        val += e[0]
                        break
                len_val += 1
            else:
                len_val += 1

        return val

    # Encoding processing
    def _encode_tone(self, memval, mode, value, pol):
        if mode == "":
            memval[0].set_raw(0xFF)
            memval[1].set_raw(0xFF)
        elif mode == 'Tone':
            memval.set_value(int(value * 10))

        elif mode == 'DTCS':
            flag = 0x80 if pol == 'N' else 0xC0
            memval.set_value(value)
            memval[1].set_bits(flag)
        else:
            raise Exception("Internal error: invalid mode `%s'" % mode)

    # encode human readable vfo tone text into a radio storable
    # binary one code 2 element array
    def _encode_vfo_tone(self, tone):
        code = [0] * 2
        if tone == "Off":
            code[0] = code[1] = 0xff
        elif tone.endswith('Hz'):  # CTCSS
            code[0] = int("%02d" %
                          (float("%s" % tone[tone.index('.') - 1:
                           tone.index('.') + 2]) * 10), 16)
            code[1] = int(str(int(tone[:tone.index('.') - 1])), 16)
        elif tone.endswith('I'):  # inverse DCS
            code[0] = int(tone[1:3], 16)
            code[1] = 0xc0 + int(tone[0:1], 16)
        elif tone.endswith('N'):  # normal DCS
            code[0] = int(tone[1:3], 16)
            code[1] = 0x80 + int(tone[0:1], 16)
        else:
            msg = "Unknown CTCSS/DTC tone: %s" % tone
            LOG.exception(msg)
            raise InvalidValueError(msg)

        return code

    # encode the DTMF char into the binary value the radio expects
    def _encode_dtmf(self, val, len_byte=True):
        list_val = []
        len_val = 0
        code_len = 0
        while len_val < (len(val)):
            if val[len_val] != ' ':
                for e in self._dtmf_code_map:
                    if e[0] == val[len_val] or e[0] == val:
                        list_val.append(e[1])
                        break
                len_val += 1
                code_len += 1
            else:
                list_val.append(0xff)
                len_val += 1

        if len_byte:
            # set len byte to 0 if all elements are 0xff
            if all(x == 0xff for x in list_val):
                code_len = 0
            # DTMF seq len is stored in the last btye
            list_val.append(code_len)

        return list_val

    def _get_mem(self, number):
        return self._memobj.memory[number]

    def _get_nam(self, number):
        return self._memobj.names[number - 1]

    def _get_fm(self, number):
        return self._memobj.fmmode[number]

    def _get_get_scanvfo(self, number):
        return self._memobj.fmvfo[number]

    def get_memory(self, number):
        _mem = self._get_mem(number)
        _nam = self._get_nam(number)
        mem = chirp_common.Memory()
        mem.number = number

        if _mem.get_raw()[0] == 0xff:
            mem.empty = True
            return mem

        # narrow and wide
        mem.mode = _mem.wide and "NFM" or "FM"

        # power
        try:
            mem.power = self._tx_power[_mem.lowpower]
            if mem.power is None:
                # Gaps are basically missing power levels
                raise IndexError()
        except IndexError:
            LOG.error("Radio reported invalid power level %s (in %s)" %
                      (_mem.lowpower, self._tx_power))
            mem.power = self._tx_power[0]

        # Channel name
        for char in _nam.name:
            if "\x00" in str(char) or "\xFF" in str(char):
                char = ""
            mem.name += str(char)

        mem.name = mem.name.rstrip()
        if self.ident_mode != b'P31183\xff\xff' and \
                (mem.number >= 189 and mem.number <= 199):
            mem.name = HAM_GMRS_NAME[mem.number - 200]

        # tmode
        lin2 = int(_mem.rxtone)
        rxtone = self._decode_tone(lin2)

        lin = int(_mem.txtone)
        txtone = self._decode_tone(lin)

        if txtone[0] == "Tone" and not rxtone[0]:
            mem.tmode = "Tone"
        elif txtone[0] == rxtone[0] and txtone[0] == "Tone" \
                and mem.rtone == mem.ctone:
            mem.tmode = "TSQL"
        elif txtone[0] == rxtone[0] and txtone[0] == "DTCS" \
                and mem.dtcs == mem.rx_dtcs:
            mem.tmode = "DTCS"
        elif rxtone[0] or txtone[0]:
            mem.tmode = "Cross"
            mem.cross_mode = "%s->%s" % (txtone[0], rxtone[0])

        chirp_common.split_tone_decode(mem, txtone, rxtone)

        mem.skip = '' if self._memobj.scanadd[mem.number - 1] else 'S'

        mem.freq = int(_mem.rxfreq) * 10
        if _mem.txfreq.get_raw() == b'\xff\xff\xff\xff':
            mem.offset = 0
            mem.duplex = 'off'
        else:
            chirp_common.split_to_offset(mem,
                                         int(_mem.rxfreq) * 10,
                                         int(_mem.txfreq) * 10)

        if self._gmrs:
            # mem.duplex = ""
            # mem.offset = 0
            if mem.number >= 1 and mem.number <= 30:
                mem.immutable.append('freq')
                if mem.number >= 8 and mem.number <= 14:
                    mem.mode = 'NFM'
                    mem.power = self._tx_power[0]
                    mem.immutable = ['freq', 'mode', 'power',
                                     'duplex', 'offset']
            elif mem.number >= 31 and mem.number <= 54:
                mem.offset = 5000000
            elif mem.number >= 189 and mem.number <= 199:
                ham_freqs = NOAA_FREQS[mem.number - 189]
                mem.freq = ham_freqs
                mem.immutable = ['name', 'power', 'duplex', 'freq',
                                 'rx_dtcs', 'vfo', 'tmode', 'empty',
                                 'offset', 'rtone', 'ctone', 'dtcs',
                                 'dtcs_polarity', 'cross_mode']
        elif self._ham:
            if mem.number >= 189 and mem.number <= 199:
                ham_freqs = NOAA_FREQS[mem.number - 189]
                mem.freq = ham_freqs
                mem.immutable = ['name', 'power', 'freq', 'rx_dtcs', 'vfo',
                                 'tmode', 'empty', 'offset', 'rtone', 'ctone',
                                 'dtcs', 'dtcs_polarity', 'cross_mode']

        # other function
        # pttid
        mem.extra = RadioSettingGroup("Extra", "extra")

        if self.MODEL != "RT-730":
            rs = RadioSetting("pttid", "PTT ID",
                              RadioSettingValueList(PTTID_VALUES,
                                                    current_index=_mem.pttid))
            mem.extra.append(rs)

        # Busylock
        rs = RadioSetting("bcl", "Busy Lock",
                          RadioSettingValueList(BCLOCK_VALUES,
                                                current_index=_mem.bcl))
        mem.extra.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting(
                "freqhop", "Hopping RX", RadioSettingValueList(
                    FREQHOP_VALUES, current_index=_mem.freqhop))
            mem.extra.append(rs)

        if self.MODEL in H3_LIST + H3_PLUS_LIST:
            rs = RadioSetting(
                "scramble", "Scramble", RadioSettingValueList(
                    self._scramble_list, current_index=_mem.scramble))
            mem.extra.append(rs)

        if chirp_common.in_range(mem.freq, self._rxbands) and \
                not chirp_common.in_range(mem.freq, self.get_tx_bands()):
            mem.duplex = 'off'
        if chirp_common.in_range(mem.freq, self._airband):
            mem.mode = 'AM'

        return mem

    def _set_mem(self, number):
        return self._memobj.memory[number]

    def _set_nam(self, number):
        return self._memobj.names[number - 1]

    def _get_scan_list(self, scan_data):
        # scan_val_list - Get all scans Add data 1-200 digits
        scan_val_list = []
        for x in range(25):
            a = self._get_scan(x)
            for i in range(0, 8):
                scan_val = (getattr(a, 'scan%i' % (i+1)))
                used_scan_val = str(scan_val)[3]
                scan_val_list.append(used_scan_val)

        # used_scan_list - 25 structures, split the scan added
        # data into 25 groups of 8 bits each
        used_scan_list = []
        count_num = 1
        for i in range(0, len(scan_val_list), 8):
            used_scan_list.append(scan_val_list[i:i + 8])
            count_num += 1
        # Determine whether it is a standard number that can be divisible
        # Which group is the scan addition located in the modified channel
        if scan_data % 8 != 0:
            x_list = scan_data / 8
            y_list = scan_data % 8

        else:
            x_list = (scan_data / 8) - 1
            y_list = 8

        return ([x_list, y_list])

    def set_memory(self, mem):
        _mem = self._get_mem(mem.number)
        _nam = self._get_nam(mem.number)

        # When the channel is empty, you need to set "usedflags" to 0,
        # When the channel is used , you need to set "usedflags" to 1.
        self._memobj.usedflags[mem.number - 1] = int(not mem.empty)

        if mem.empty:
            _mem.fill_raw(b'\xFF')
            return

        _mem.fill_raw(b'\x00')

        if mem.duplex == "":
            _mem.rxfreq = _mem.txfreq = mem.freq / 10
        elif mem.duplex == "split":
            _mem.txfreq = mem.offset / 10
        elif mem.duplex == "+":
            _mem.txfreq = (mem.freq + mem.offset) / 10
        elif mem.duplex == "-":
            _mem.txfreq = (mem.freq - mem.offset) / 10
        elif mem.duplex == 'off':
            _mem.txfreq.fill_raw(b'\xFF')
        else:
            _mem.txfreq = mem.freq / 10

        if chirp_common.in_range(mem.freq, self._rxbands) and \
                not chirp_common.in_range(mem.freq, self.get_tx_bands()):
            _mem.txfreq.fill_raw(b'\xFF')

        _mem.rxfreq = mem.freq / 10
        _namelength = self.get_features().valid_name_length

        for i in range(_namelength):
            try:
                _nam.name[i] = mem.name[i]
            except IndexError:
                _nam.name[i] = "\x00"

        txtone, rxtone = chirp_common.split_tone_encode(mem)

        self._encode_tone(_mem.txtone, *txtone)
        self._encode_tone(_mem.rxtone, *rxtone)

        if mem.mode == "FM":
            _mem.wide = 0
        else:
            _mem.wide = 1

        try:
            _mem.lowpower = self._tx_power.index(mem.power or
                                                 self._tx_power[-1])
        except ValueError:
            _mem.lowpower = 0
            LOG.warning('Unsupported power %r', mem.power)

        # Skip/Scanadd Setting
        self._memobj.scanadd[mem.number - 1] = mem.skip != 'S'

        for setting in mem.extra:
            if (self.ident_mode == b'P31185\xff\xff' or
                self.ident_mode == b'P31184\xff\xff') and \
                    mem.number >= 189 and mem.number <= 199:
                if setting.get_name() == 'pttid':
                    setting.value = 'Off'
                    setattr(_mem, setting.get_name(), setting.value)
                elif setting.get_name() == 'bcl':
                    setting.value = 'Off'
                    setattr(_mem, setting.get_name(), setting.value)
                elif setting.get_name() == 'freqhop':
                    setting.value = 'Off'
                    setattr(_mem, setting.get_name(), setting.value)
                elif setting.get_name() == 'scramble':
                    setting.value = 'Off'
                    setattr(_mem, setting.get_name(), setting.value)
            else:
                setattr(_mem, setting.get_name(), setting.value)

    def _is_orig(self):
        version_tag = _firmware_version_from_image(self)
        try:
            if b'BFB' in version_tag:
                idx = version_tag.index(b"BFB") + 3
                version = int(version_tag[idx:idx + 3])
                return version < 291
            return False
        except Exception:
            pass
        raise errors.RadioError("Unable to parse version string %s" %
                                version_tag)

    def _my_upper_band(self):
        band_tag = _upper_band_from_image(self)
        return band_tag

    def _get_settings(self):
        _settings = self._memobj.settings
        _press = self._memobj.press
        _aoffset = self._memobj.aoffset
        _boffset = self._memobj.boffset
        _vfoa = self._memobj.vfoa
        _vfob = self._memobj.vfob

        if self.MODEL != "RT-730":
            _gcode = self._memobj.groupcode
            _bluetooth = self._memobj.bluetooth
            _powertune = self._memobj.powertune

        _msg = self._memobj.poweron_msg
        basic = RadioSettingGroup("basic", "Basic Settings")
        abblock = RadioSettingGroup("abblock", "VFO A/B Channel")
        fmmode = RadioSettingGroup("fmmode", "FM")
        dtmf = RadioSettingGroup("dtmf", "DTMF")
        group = RadioSettings(basic)

        if self.MODEL != "RT-730":
            bluetooth = RadioSettingGroup("bluetooth", "Bluetooth")
            powertune = RadioSettingGroup("powertune", "TX Power Tune")
            rs = RadioSetting("radiomode", "Radio Operating Mode",
                              RadioSettingValueList(
                                RADIO_MODE_LIST,
                                current_index=(0 if _settings.ham else 1
                                               if _settings.gmrs else 2)))
            rs.set_warning(_(
              'This should only be used to change the operating MODE of your '
              'radio if you understand the legalities and implications of '
              'doing so. The change may enable the radio to transmit on '
              'frequencies it is not Type Accepted to do and my be in '
              'violation of FCC and other governing agency regulations.\n\n'
              'It may make your saved image files incompatible with the radio '
              'and non-usable until you change the radio MODE back to the '
              'MODE in effect when the image file was saved. After the '
              'changed image is uploaded, the radio may have to turned OFF '
              'and back ON to have the MODE changes take full effect.\n'
              'DO NOT attempt to edit any settings until uploading to and '
              'downloading from the radio with the new operating MODE.'))
            rs.set_doc = "Set the Operating Mode of the radio. Operating \
                Modes include HAM, GMRS or Normal (unlocked). Each mode has \
                different frequency ranges and capibilities."
            basic.append(rs)

            if self.MODEL != "RT-730":
                group.append(bluetooth)
                rs = RadioSetting("btstatus", "Bluetooth",
                                  RadioSettingValueBoolean(
                                    _bluetooth.btstatus))

                bluetooth.append(rs)

        rs = RadioSetting("squelch", "Squelch Level",
                          RadioSettingValueList(
                              SQUELCH, current_index=_settings.squelch))
        basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("ligcon", "Light Control",
                              RadioSettingValueList(
                                  LIGHT_LIST, current_index=_settings.ligcon))
            basic.append(rs)

        rs = RadioSetting("voiceprompt", "Voice Prompt",
                          RadioSettingValueBoolean(_settings.voiceprompt))
        basic.append(rs)

        rs = RadioSetting("keyautolock", "Auto Lock",
                          RadioSettingValueBoolean(_settings.keyautolock))
        basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("mdfa", "MDF-A",
                              RadioSettingValueList(
                                  MDFA_LIST,
                                  current_index=_settings.mdfa))
            basic.append(rs)

            rs = RadioSetting("mdfb", "MDF-B",
                              RadioSettingValueList(
                                  MDFB_LIST,
                                  current_index=_settings.mdfb))
            basic.append(rs)

            rs = RadioSetting("sync", "SYNC",
                              RadioSettingValueBoolean(
                                  not _settings.sync))
            basic.append(rs)

            rs = RadioSetting("save", self._save_shortname,
                              RadioSettingValueList(
                                  self._save_list,
                                  current_index=_settings.save))
            basic.append(rs)

        rs = RadioSetting("dbrx", "Double Rx",
                          RadioSettingValueBoolean(_settings.dbrx))
        basic.append(rs)

        rs = RadioSetting("scanmode", "Scan Mode",
                          RadioSettingValueList(
                              SCAN_MODE_LIST,
                              current_index=_settings.scanmode))
        basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("pritx", "Priority TX",
                              RadioSettingValueList(
                                  PRIO_LIST, current_index=_settings.pritx))
            basic.append(rs)

        rs = RadioSetting("btnvoice", "Beep",
                          RadioSettingValueBoolean(_settings.btnvoice))
        basic.append(rs)

        if self.MODEL != "RT-730":
            if self.MODEL in H8_LIST:
                # H8 uses roger-beep bool
                rs = RadioSetting("rogerprompt", "Roger",
                                  RadioSettingValueBoolean(
                                    _settings.rogerprompt))
                basic.append(rs)

            if self.MODEL in H3_LIST + H3_PLUS_LIST:
                # H3 uses roger-beep list
                rs = RadioSetting("rogerprompt", "Roger",
                                  RadioSettingValueList(
                                      self._roger_list,
                                      current_index=_settings.rogerprompt))
                basic.append(rs)

                if _settings.brightness not in range(0, 5):
                    LOG.warning(
                        "brightness out of range 1 to 5. Actual value: 0x%x. "
                        "Screen may not be visable",
                        _settings.brightness)

                rs = RadioSetting("brightness", "Brightness",
                                  RadioSettingValueMap(
                                      self._brightness_map,
                                      _settings.brightness))
                basic.append(rs)

        rs = RadioSetting("txled", "Disp Lcd(TX)",
                          RadioSettingValueBoolean(_settings.txled))
        basic.append(rs)

        rs = RadioSetting("rxled", "Disp Lcd(RX)",
                          RadioSettingValueBoolean(_settings.rxled))
        basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("onlychmode", "Only CH Mode",
                              RadioSettingValueBoolean(_settings.onlychmode))
            basic.append(rs)

            if self.MODEL in H3_PLUS_LIST:
                rs = RadioSetting("ssidekey1", "PF1 Short Press",
                                  RadioSettingValueMap(
                                      self._short_key_map,
                                      _press.ssidekey1))
                basic.append(rs)

                rs = RadioSetting("lsidekey3", "PF1 Long Press",
                                  RadioSettingValueList(
                                      self.LONG_KEY_LIST,
                                      current_index=_press.lsidekey3
                                      if _press.ssidekey1 < 7 else 0))
                basic.append(rs)

                rs = RadioSetting("ssidekey2", "PF2 Short Press",
                                  RadioSettingValueMap(
                                      self._short_key_map,
                                      _press.ssidekey2))
                basic.append(rs)

                rs = RadioSetting("lsidekey4", "PF2 Long Press",
                                  RadioSettingValueList(
                                      self.LONG_KEY_LIST,
                                      current_index=_press.lsidekey4
                                      if _press.ssidekey2 < 7 else 0))
                basic.append(rs)

            else:
                rs = RadioSetting("press.ssidekey1", "SHORT_KEY_PF1",
                                  RadioSettingValueList(
                                      SHORT_KEY_LIST,
                                      current_index=_press.ssidekey1))
                basic.append(rs)

                rs = RadioSetting("press.lsidekey3", "LONG_KEY_PF1",
                                  RadioSettingValueList(
                                      LONG_KEY_LIST,
                                      current_index=_press.lsidekey3))
                basic.append(rs)

        if self.MODEL in H8_LIST:
            rs = RadioSetting("stopkey1", "SHORT_KEY_TOP",
                              RadioSettingValueList(
                                  SHORT_KEY_LIST,
                                  current_index=_press.stopkey1))
            basic.append(rs)

            rs = RadioSetting("ltopkey2", "LONG_KEY_TOP",
                              RadioSettingValueList(
                                  LONG_KEY_LIST,
                                  current_index=_press.ltopkey2))
            basic.append(rs)

            rs = RadioSetting("ssidekey2", "SHORT_KEY_PF2",
                              RadioSettingValueList(
                                  SHORT_KEY_LIST,
                                  current_index=_press.ssidekey2))
            basic.append(rs)

            rs = RadioSetting("lsidekey4", "LONG_KEY_PF2",
                              RadioSettingValueList(
                                LONG_KEY_LIST,
                                current_index=_press.lsidekey4))
            basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("tonevoice", "Repeater Tone",
                              RadioSettingValueList(
                                  RTONE_LIST,
                                  current_index=_settings.tonevoice))
            basic.append(rs)

        if self.MODEL in H3_PLUS_LIST + H8_LIST:
            rs = RadioSetting("lang", "Language",
                              RadioSettingValueMap(
                                  self._lang_map,
                                  _settings.lang))
            basic.append(rs)

        if self.MODEL in H3_LIST + H3_PLUS_LIST:
            rs = RadioSetting("alarm", "Alarm Mode",
                              RadioSettingValueList(
                                ALARM_LIST,
                                current_index=_settings.alarm))
            basic.append(rs)

            rs = RadioSetting("amband", "AM BAND",
                              RadioSettingValueBoolean(_settings.amband))
            basic.append(rs)

            rs = RadioSetting("tot", "Time-Out Timer",
                              RadioSettingValueList(
                                TOT_LIST,
                                current_index=_settings.tot))
            basic.append(rs)

            rs = RadioSetting("tx220", "TX 220",
                              RadioSettingValueBoolean(_settings.tx220))
            basic.append(rs)

            rs = RadioSetting("tx350", "TX 350",
                              RadioSettingValueBoolean(_settings.tx350))
            basic.append(rs)

            rs = RadioSetting("tx500", "TX 500",
                              RadioSettingValueBoolean(_settings.tx500))
            basic.append(rs)

            # older firmware sets 0xCA0-0xCA7 to FF
            if _settings.scanband <= len(SCAN_BAND_LIST):
                rs = RadioSetting("scanband", "Scan Band",
                                  RadioSettingValueList(
                                    SCAN_BAND_LIST,
                                    current_index=_settings.scanband))
                basic.append(rs)

        if self.MODEL != "RT-730":
            rs = RadioSetting("voxgain", "VOX Gain",
                              RadioSettingValueList(
                                  VOX_GAIN,
                                  current_index=_settings.voxgain))
            basic.append(rs)

            rs = RadioSetting("voxdelay", "VOX Delay",
                              RadioSettingValueList(
                                  VOX_DELAY,
                                  current_index=_settings.voxdelay))
            basic.append(rs)

            rs = RadioSetting("breathled", "Breath Led",
                              RadioSettingValueList(
                                  self._breath_led_list,
                                  current_index=_settings.breathled))
            basic.append(rs)

            rs = RadioSetting("ponmsg", "Power-On Message",
                              RadioSettingValueList(
                                  self._ponmsg_list,
                                  current_index=_settings.ponmsg))
            basic.append(rs)

            # mic gain
            _mic = self._memobj.mic
            rs = RadioSetting("micgain", "MIC GAIN",
                              RadioSettingValueList(
                                  self._mic_gain_list,
                                  current_index=_mic.micgain))
            basic.append(rs)

            if self.MODEL in H3_LIST + H8_LIST:
                rs = RadioSetting("tailclean", "Squelch TAIL Elimination",
                                  RadioSettingValueBoolean(
                                      _settings.tailclean))
                basic.append(rs)

                _rpt = self._memobj.rpt
                rs = RadioSetting("rpste",
                                  "Repeater Squelch TAIL Elimination Delay",
                                  RadioSettingValueList(
                                      self._rpt_delay_list,
                                      current_index=_rpt.rpste))
                basic.append(rs)

                rs = RadioSetting("rptrl", "Repeater Squelch TAIL Tone Delay",
                                  RadioSettingValueList(
                                      self._rpt_delay_list,
                                      current_index=_rpt.rptrl))
                basic.append(rs)

            if self.MODEL not in H8_LIST:
                rs = RadioSetting("kill", "Kill",
                                  RadioSettingValueBoolean(_settings.kill))
                basic.append(rs)
                rs = RadioSetting("stun", "Stun",
                                  RadioSettingValueBoolean(_settings.stun))
                basic.append(rs)

        def _filter(name):
            filtered = ""
            for char in str(name):
                if char in chirp_common.CHARSET_ASCII:
                    filtered += char
                else:
                    filtered += " "
            return filtered

        rs = RadioSetting("poweron_msg.msg1", "Power-On Message 1",
                          RadioSettingValueString(0, 16, _filter(_msg.msg1)))
        basic.append(rs)
        rs = RadioSetting("poweron_msg.msg2", "Power-On Message 2",
                          RadioSettingValueString(0, 16, _filter(_msg.msg2)))
        basic.append(rs)
        rs = RadioSetting("poweron_msg.msg3", "Power-On Message 3",
                          RadioSettingValueString(0, 16, _filter(_msg.msg3)))
        basic.append(rs)
        if self.MODEL == "RT-730":
            rsvs = RadioSettingValueString(0, 16, _filter(_msg.msg4))
            rs = RadioSetting("poweron_msg.msg4", "Power-On Message 4", rsvs)
            basic.append(rs)

        if self.MODEL == "RT-730":
            rs = RadioSetting("ligcon", "Light Control",
                              RadioSettingValueList(
                                  LIGHT730_LIST,
                                  current_index=_settings.ligcon))
            basic.append(rs)

            rs = RadioSetting("tot", "Time-out Timer",
                              RadioSettingValueList(
                                  TIMEOUT730_LIST,
                                  current_index=_settings.tot))
            basic.append(rs)

            rs = RadioSetting("press.rogerprompt", "Roger",
                              RadioSettingValueList(
                                  PTTID_VALUES,
                                  current_index=_press.rogerprompt))
            basic.append(rs)

            rs = RadioSetting("lang", "Language",
                              RadioSettingValueMap(
                                  self._lang_map,
                                  _settings.lang))
            basic.append(rs)

            rs = RadioSetting("save", "Battery Save",
                              RadioSettingValueBoolean(_settings.save))
            basic.append(rs)

            rs = RadioSetting("mdfa", "Channel Names",
                              RadioSettingValueBoolean(_settings.mdfa))
            basic.append(rs)

            rs = RadioSetting("hoptype", "Hop Type",
                              RadioSettingValueList(
                                  HOP_LIST,
                                  current_index=_settings.hoptype))
            basic.append(rs)

            rs = RadioSetting("tailclean", "QT/DQT Tail",
                              RadioSettingValueBoolean(_settings.tailclean))
            basic.append(rs)

            rs = RadioSetting("press.ssidekey1", "PF1 Key(Short)",
                              RadioSettingValueList(
                                  SHORT_KEY730_LIST,
                                  current_index=_press.ssidekey1))
            basic.append(rs)
            rs = RadioSetting("press.lsidekey1", "PF1 Key(Long)",
                              RadioSettingValueList(
                                  LONG_KEY730_LIST,
                                  current_index=_press.lsidekey1))
            basic.append(rs)
            rs = RadioSetting("press.ssidekey2", "PF2 Key(Short)",
                              RadioSettingValueList(
                                  SHORT_KEY730_LIST,
                                  current_index=_press.ssidekey2))
            basic.append(rs)
            rs = RadioSetting("press.lsidekey2", "PF2 Key(Long)",
                              RadioSettingValueList(
                                  LONG_KEY730_LIST,
                                  current_index=_press.lsidekey2))
            basic.append(rs)

            rs = RadioSetting("voxgain", "VOX Gain",
                              RadioSettingValueList(
                                  VOX_GAIN730,
                                  current_index=_settings.voxgain))
            basic.append(rs)

            rs = RadioSetting("voxdelay", "VOX Delay",
                              RadioSettingValueList(
                                  VOX_DELAY730,
                                  current_index=_settings.voxdelay))
            basic.append(rs)

        if self.MODEL != "RT-730":
            group.append(abblock)

            # VFO A channel sub menu
            achannel = RadioSettingSubGroup("achannel", "VFO A Channel")
            abblock.append(achannel)

            # A channel
            a_freq = int(_vfoa.rxfreqa)
            freqa = "%i.%05i" % (a_freq / 100000, a_freq % 100000)
            if freqa == "0.00000":
                val1a = RadioSettingValueString(0, 7, '0.00000')
            else:
                val1a = RadioSettingValueFloat(
                    136, 520, float(freqa), 0.00001, 5)
            rs = RadioSetting("rxfreqa", "Frequency", val1a)
            abblock.append(rs)

            # Offset
            # If the offset is 12.345
            # Then the data obtained is [0x45, 0x23, 0x01, 0x00]
            a_set_val = _aoffset.ofseta
            a_set_list = len(_aoffset.ofseta) - 1
            real_val = ''
            for i in range(a_set_list, -1, -1):
                real_val += str(a_set_val[i])[2:]
            if real_val == "FFFFFFFF":
                rs = RadioSetting("ofseta", "Offset",
                                  RadioSettingValueString(0, 7, ""))
            else:
                real_val = int(real_val)
                real_val = "%i.%05i" % (real_val / 100000, real_val % 100000)
                rs = RadioSetting("ofseta", "Offset",
                                  RadioSettingValueFloat(
                                      0.00000, 59.99750, real_val, 0.00001, 5))
            abblock.append(rs)

            rs = RadioSetting("offset", "Offset Direction",
                              RadioSettingValueList(
                                  A_OFFSET, current_index=_vfoa.offset))
            abblock.append(rs)

            try:
                self._tx_power[_vfoa.lowpower]
                cur_a_power = _vfoa.lowpower
            except IndexError:
                cur_a_power = 0
            rs = RadioSetting("lowpower", "TX Power",
                              RadioSettingValueList(
                                [str(x) for x in self._tx_power],
                                current_index=cur_a_power))
            abblock.append(rs)

            rs = RadioSetting("wide", "Bandwidth",
                              RadioSettingValueList(
                                  A_BAND, current_index=_vfoa.wide))
            abblock.append(rs)

            rs = RadioSetting("astep", "Tuning Step",
                              RadioSettingValueList(
                                  self._step_list,
                                  current_index=_settings.astep))
            abblock.append(rs)

            rs = RadioSetting("rxtone", "RX CTCSS/DCS",
                              RadioSettingValueList(
                                  self._code_list,
                                  current_index=self._code_list.index(
                                      self._decode_vfo_tone(_vfoa.rxtone))))
            abblock.append(rs)

            rs = RadioSetting("txtone", "TX CTCSS/DCS",
                              RadioSettingValueList(
                                  self._code_list,
                                  current_index=self._code_list.index(
                                      self._decode_vfo_tone(_vfoa.txtone))))
            abblock.append(rs)

            if self.MODEL in H8_LIST + H3_LIST:
                rs = RadioSetting(
                    "pttid", "PTT ID",
                    RadioSettingValueList(
                        PTTID_VALUES,
                        current_index=_vfoa.pttid
                    )
                )
                abblock.append(rs)

            rs = RadioSetting("bcl", "Busy Lock",
                              RadioSettingValueBoolean(_settings.ablock))
            abblock.append(rs)

            rs = RadioSetting("freqhop", "Hopping RX",
                              RadioSettingValueBoolean(_vfoa.freqhop))
            abblock.append(rs)

            if self.MODEL in H3_LIST + H3_PLUS_LIST:
                rs = RadioSetting(
                    "scramble", "Scramble",
                    RadioSettingValueList(
                        self._scramble_list,
                        current_index=_vfoa.scramble
                    )
                )
                abblock.append(rs)

            rs = RadioSetting(
                "aworkmode", "Work Mode",
                RadioSettingValueList(
                    A_WORKMODE, current_index=_settings.aworkmode))
            abblock.append(rs)

            # VFO B channel sub menu
            bchannel = RadioSettingSubGroup("bchannel", "VFO B Channel")
            abblock.append(bchannel)

            # B channel
            b_freq = int(str(int(_vfob.rxfreqb)).ljust(8, '0'))
            freqb = "%i.%05i" % (b_freq / 100000, b_freq % 100000)
            if freqb == "0.00000":
                val1a = RadioSettingValueString(0, 7, '0.00000')
            else:
                val1a = RadioSettingValueFloat(
                    136, 520, float(freqb), 0.00001, 5)
            rs = RadioSetting("rxfreqb", "Frequency", val1a)
            abblock.append(rs)

            # Offset frequency
            # If the offset is 12.345
            # Then the data obtained is [0x45, 0x23, 0x01, 0x00]
            # Need to use the following anonymous function to process data
            b_set_val = _boffset.ofsetb
            b_set_list = len(_boffset.ofsetb) - 1
            real_val = ''
            for i in range(b_set_list, -1, -1):
                real_val += str(b_set_val[i])[2:]
            if real_val == "FFFFFFFF":
                rs = RadioSetting("ofsetb", "Offset",
                                  RadioSettingValueString(0, 7, ""))
            else:
                real_val = int(real_val)
                real_val = "%i.%05i" % (real_val / 100000, real_val % 100000)
                rs = RadioSetting("ofsetb", "Offset",
                                  RadioSettingValueFloat(
                                      0.00000, 59.99750, real_val, 0.00001, 5))
            abblock.append(rs)

            rs = RadioSetting("offsetb", "Offset Direction",
                              RadioSettingValueList(
                                  B_OFFSET, current_index=_vfob.offsetb))
            abblock.append(rs)

            try:
                self._tx_power[_vfob.lowpowerb]
                cur_b_power = _vfob.lowpowerb
            except IndexError:
                cur_b_power = 0
            rs = RadioSetting("lowpowerb", "TX Power",
                              RadioSettingValueList(
                                [str(x) for x in self._tx_power],
                                current_index=cur_b_power))
            abblock.append(rs)

            rs = RadioSetting("wideb", "Bandwidth",
                              RadioSettingValueList(
                                  B_BAND, current_index=_vfob.wideb))
            abblock.append(rs)

            rs = RadioSetting("bstep", "Tuning Step",
                              RadioSettingValueList(
                                  self._step_list,
                                  current_index=_settings.bstep))
            abblock.append(rs)

            rs = RadioSetting("rxtoneb", "RX CTCSS/DCS",
                              RadioSettingValueList(
                                  self._code_list,
                                  current_index=self._code_list.index(
                                      self._decode_vfo_tone(_vfob.rxtoneb))))
            abblock.append(rs)

            rs = RadioSetting("txtoneb", "TX CTCSS/DCS",
                              RadioSettingValueList(
                                  self._code_list,
                                  current_index=self._code_list.index(
                                      self._decode_vfo_tone(_vfob.txtoneb))))
            abblock.append(rs)

            if self.MODEL in H8_LIST + H3_LIST:
                rs = RadioSetting(
                    "pttidb", "PTT ID",
                    RadioSettingValueList(
                        PTTID_VALUES,
                        current_index=_vfob.pttidb
                    )
                )
                abblock.append(rs)

            rs = RadioSetting("bclb", "Busy Lock",
                              RadioSettingValueBoolean(_settings.bblock))
            abblock.append(rs)

            rs = RadioSetting("freqhopb", "Hopping RX",
                              RadioSettingValueBoolean(_vfob.freqhopb))
            abblock.append(rs)

            if self.MODEL in H3_LIST + H3_PLUS_LIST:
                rs = RadioSetting(
                    "scrambleb", "Scramble",
                    RadioSettingValueList(
                        self._scramble_list,
                        current_index=_vfob.scrambleb
                    )
                )
                abblock.append(rs)

            rs = RadioSetting(
                "bworkmode", "Work Mode",
                RadioSettingValueList(
                    B_WORKMODE, current_index=_settings.bworkmode))
            abblock.append(rs)

        group.append(fmmode)

        rs = RadioSetting("fmworkmode", "Work Mode",
                          RadioSettingValueList(
                              FM_WORKMODE,
                              current_index=_settings.fmworkmode))
        fmmode.append(rs)

        rs = RadioSetting("fmroad", "Channel",
                          RadioSettingValueList(
                              FM_CHANNEL,
                              current_index=_settings.fmroad))
        fmmode.append(rs)

        rs = RadioSetting("fmrec", self._fmrec_shortname,
                          RadioSettingValueBoolean(_settings.fmrec))
        fmmode.append(rs)

        # FM
        numeric = '0123456789.'
        for i in range(25):
            if self._memobj.fmusedflags[i]:
                _fm = self._get_fm(i).fmblock
                try:
                    if not (760 < int(_fm) < 1080):
                        raise ValueError()
                    val = '%.1f' % (int(_fm) / 10)
                except ValueError:
                    LOG.warning('FM channel index %i is invalid', i)
                    val = ''
            else:
                val = ''
            rs = RadioSetting('block%02i' % i, "Channel %i" % (i + 1),
                              RadioSettingValueString(0, 5,
                                                      val,
                                                      False, charset=numeric))
            fmmode.append(rs)

        try:
            _fmv = int(self._memobj.fmvfo) / 10
        except ValueError:
            LOG.warning('FM VFO is invalid')
            _fmv = 0

        rs = RadioSetting(
            "fmvfo", "VFO", RadioSettingValueFloat(
                76.0, 108.0, _fmv, 0.1, 1))
        fmmode.append(rs)

        if self.MODEL != "RT-730":
            group.append(dtmf)

            # DTMF
            rs = RadioSetting("gcode", "Group Code",
                              RadioSettingValueMap(
                                GROUPCODE_MAP, _gcode.gcode))
            dtmf.append(rs)

            dtmfcharsani = "0123456789ABCD*# "
            icode_list = self._memobj.icode.idcode
            used_icode = self._decode_dtmf(icode_list)
            i_val = RadioSettingValueString(0, 3, used_icode)
            rs = RadioSetting("icode", "ID Code", i_val)
            i_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_1 = self._memobj.group1.group1
            used_group1 = self._decode_dtmf(gcode_list_1, True)
            group1_val = RadioSettingValueString(0, 15, used_group1)
            rs = RadioSetting("group1", "1", group1_val)
            group1_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_2 = self._memobj.group2.group2
            used_group2 = self._decode_dtmf(gcode_list_2, True)
            group2_val = RadioSettingValueString(0, 15, used_group2)
            rs = RadioSetting("group2", "2", group2_val)
            group2_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_3 = self._memobj.group3.group3
            used_group3 = self._decode_dtmf(gcode_list_3, True)
            group3_val = RadioSettingValueString(0, 15, used_group3)
            rs = RadioSetting("group3", "3", group3_val)
            group3_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_4 = self._memobj.group4.group4
            used_group4 = self._decode_dtmf(gcode_list_4, True)
            group4_val = RadioSettingValueString(0, 15, used_group4)
            rs = RadioSetting("group4", "4", group4_val)
            group4_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_5 = self._memobj.group5.group5
            used_group5 = self._decode_dtmf(gcode_list_5, True)
            group5_val = RadioSettingValueString(0, 15, used_group5)
            rs = RadioSetting("group5", "5", group5_val)
            group5_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_6 = self._memobj.group6.group6
            used_group6 = self._decode_dtmf(gcode_list_6, True)
            group6_val = RadioSettingValueString(0, 15, used_group6)
            rs = RadioSetting("group6", "6", group6_val)
            group6_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_7 = self._memobj.group7.group7
            used_group7 = self._decode_dtmf(gcode_list_7, True)
            group7_val = RadioSettingValueString(0, 15, used_group7)
            rs = RadioSetting("group7", "7", group7_val)
            group7_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            gcode_list_8 = self._memobj.group8.group8
            used_group8 = self._decode_dtmf(gcode_list_8, True)
            group8_val = RadioSettingValueString(0, 15, used_group8)
            rs = RadioSetting("group8", "8", group8_val)
            group8_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            scode_list = self._memobj.startcode.scode
            used_scode = self._decode_dtmf(scode_list, True)
            scode_val = RadioSettingValueString(0, 7, used_scode)
            rs = RadioSetting("scode", "PTT ID Starting(BOT)", scode_val)
            scode_val.set_charset(dtmfcharsani)
            dtmf.append(rs)

            ecode_list = self._memobj.endcode.ecode
            used_ecode = self._decode_dtmf(ecode_list, True)
            ecode_val = RadioSettingValueString(0, 7, used_ecode)
            rs = RadioSetting("ecode", "PTT ID Ending(EOT)", ecode_val)
            dtmf.append(rs)
            if self.MODEL in H8_LIST:
                rs = RadioSetting("dtmfst", "DTMF Side Tones",
                                  RadioSettingValueBoolean(_settings.dtmfst))
                dtmf.append(rs)

            # H3
            if self.MODEL not in H8_LIST:
                # stuncode
                ecode_list = self._memobj.skcode.stuncode
                used_ecode = self._decode_dtmf(ecode_list, True)
                ecode_val = RadioSettingValueString(0, 15, used_ecode)
                rs = RadioSetting("stuncode", "Stun Code", ecode_val)
                dtmf.append(rs)
                # killcode
                ecode_list = self._memobj.skcode.killcode
                used_ecode = self._decode_dtmf(ecode_list, True)
                ecode_val = RadioSettingValueString(0, 15, used_ecode)
                rs = RadioSetting("killcode", "Kill Code", ecode_val)
                dtmf.append(rs)
            if self.MODEL in H3_LIST + H3_PLUS_LIST and \
                    _settings.scanband <= len(SCAN_BAND_LIST):
                # older firmware sets 0xCA0-0xCA7 to FF
                # Scanband is not defined for FF
                # so it's a proxy for old firmware that needs these hidden
                rs = RadioSetting("dtmfst", "DTMF Side Tones",
                                  RadioSettingValueBoolean(_settings.dtmfst))
                dtmf.append(rs)

                rs = RadioSetting("dtmfdecode", "DTMF Decode Enable",
                                  RadioSettingValueBoolean(
                                    _settings.dtmfdecode))
                dtmf.append(rs)

                rs = RadioSetting("dtmfautorst", "DTMF Auto Reset Times",
                                  RadioSettingValueList(
                                    DTMF_AUTO_RESET_LIST,
                                    current_index=_settings.dtmfautorst))
                dtmf.append(rs)

                rs = RadioSetting("dtmfdecoderesp", "DTMF Decoding Response",
                                  RadioSettingValueList(
                                    DTMF_DECODING_RESPONSE_LIST,
                                    current_index=_settings.dtmfdecoderesp))
                dtmf.append(rs)

                rs = RadioSetting("dtmfspeed", "DTMF Speed",
                                  RadioSettingValueList(
                                    DTMF_SPEED_LIST,
                                    current_index=_settings.dtmfspeed))
                dtmf.append(rs)

            if self.MODEL in H8_LIST + H3_LIST + H3_PLUS_LIST:
                group.append(powertune)
                lowpower = \
                    RadioSettingSubGroup("lowpower",
                                         ("Low Power: Freq. (MHz) "
                                          "- Power Factor (0-255):"))
                powertune.append(lowpower)
                if self.MODEL in H8_LIST:  # only H8 has mid power
                    midpower = \
                        RadioSettingSubGroup("midpower",
                                             ("Mid Power: Freq. (MHz) "
                                              "- Power Factor (0-255):"))
                    powertune.append(midpower)
                higpower = \
                    RadioSettingSubGroup("higpower",
                                         ("High Power: Freq. (MHz) "
                                          "- Power Factor (0-255):"))
                powertune.append(higpower)

                # low power
                rs = RadioSetting("low136", "136-140",
                                  RadioSettingValueInteger(
                                      0x00, 0xff, _powertune.low136, 1))
                lowpower.append(rs)
                rs = RadioSetting("low140", "140-150",
                                  RadioSettingValueInteger(
                                      0x00, 0xff, _powertune.low140, 1))
                lowpower.append(rs)
                rs = RadioSetting("low150", "150-160",
                                  RadioSettingValueInteger(
                                      0x00, 0xff, _powertune.low150, 1))
                lowpower.append(rs)
                rs = RadioSetting("low160", "160-170",
                                  RadioSettingValueInteger(
                                      0x00, 0xff, _powertune.low160, 1))
                lowpower.append(rs)
                rs = RadioSetting("low170", "170-",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low170, 1))
                lowpower.append(rs)
                rs = RadioSetting("low400", "400-410",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low400, 1))
                lowpower.append(rs)
                rs = RadioSetting("low410", "410-420",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low410, 1))
                lowpower.append(rs)
                rs = RadioSetting("low420", "420-430",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low420, 1))
                lowpower.append(rs)
                rs = RadioSetting("low430", "430-440",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low430, 1))
                lowpower.append(rs)
                rs = RadioSetting("low440", "440-450",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low440, 1))
                lowpower.append(rs)
                rs = RadioSetting("low450", "450-460",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low450, 1))
                lowpower.append(rs)
                rs = RadioSetting("low460", "460-470",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low460, 1))
                lowpower.append(rs)
                rs = RadioSetting("low470", "470-",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low470, 1))
                lowpower.append(rs)
                rs = RadioSetting("low245", "245",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.low245, 1))
                lowpower.append(rs)

                if self.MODEL in H8_LIST:  # only H8 has mid power
                    rs = RadioSetting("mid136", "136-140",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid136, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid140", "140-150",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid140, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid150", "150-160",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid150, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid160", "160-170",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid160, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid170", "170-",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid170, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid400", "400-410",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid400, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid410", "410-420",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid410, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid420", "420-430",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid420, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid430", "430-440",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid430, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid440", "440-450",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid440, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid450", "450-460",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid450, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid460", "460-470",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid460, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid470", "470-",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid470, 1))
                    midpower.append(rs)
                    rs = RadioSetting("mid245", "245",
                                      RadioSettingValueInteger(
                                            0x00, 0xff, _powertune.mid245, 1))
                    midpower.append(rs)

                # high power
                rs = RadioSetting("hig136", "136-140",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig136, 1))
                higpower.append(rs)
                rs = RadioSetting("hig140", "140-150",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig140, 1))
                higpower.append(rs)
                rs = RadioSetting("hig150", "150-160",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig150, 1))
                higpower.append(rs)
                rs = RadioSetting("hig160", "160-170",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig160, 1))
                higpower.append(rs)
                rs = RadioSetting("hig170", "170-",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig170, 1))
                higpower.append(rs)
                rs = RadioSetting("hig400", "400-410",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig400, 1))
                higpower.append(rs)
                rs = RadioSetting("hig410", "410-420",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig410, 1))
                higpower.append(rs)
                rs = RadioSetting("hig420", "420-430",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig420, 1))
                higpower.append(rs)
                rs = RadioSetting("hig430", "430-440",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig430, 1))
                higpower.append(rs)
                rs = RadioSetting("hig440", "440-450",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig440, 1))
                higpower.append(rs)
                rs = RadioSetting("hig450", "450-460",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig450, 1))
                higpower.append(rs)
                rs = RadioSetting("hig460", "460-470",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig460, 1))
                higpower.append(rs)
                rs = RadioSetting("hig470", "470-",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig470, 1))
                higpower.append(rs)
                rs = RadioSetting("hig245", "245",
                                  RadioSettingValueInteger(
                                        0x00, 0xff, _powertune.hig245, 1))
                higpower.append(rs)

        return group

    def get_settings(self):
        try:
            return self._get_settings()
        except Exception:
            raise InvalidValueError("Setting Failed!")

    def set_settings(self, settings):

        def fm_validate(value):
            if 760 > value or value > 1080:
                msg = ("FM Channel must be between 76.0-108.0")
                raise InvalidValueError(msg)

        _settings = self._memobj.settings
        _press = self._memobj.press
        _aoffset = self._memobj.aoffset
        _boffset = self._memobj.boffset
        _vfoa = self._memobj.vfoa
        _vfob = self._memobj.vfob
        _fmmode = self._memobj.fmmode

        _radio = radiomode()

        if self.MODEL != "RT-730":
            _bluetooth = self._memobj.bluetooth
        if self.MODEL in H8_LIST + H3_LIST + H3_PLUS_LIST:
            _powertune = self._memobj.powertune

        for element in settings:
            if not isinstance(element, RadioSetting):
                if element.get_name() == "fm_preset":
                    self._set_fm_preset(element)
                else:
                    self.set_settings(element)
                    continue
            else:
                try:
                    name = element.get_name()
                    if "." in name:
                        bits = name.split(".")
                        obj = self._memobj
                        for bit in bits[:-1]:
                            if "/" in bit:
                                bit, index = bit.split("/", 1)
                                index = int(index)
                                obj = getattr(obj, bit)[index]
                            else:
                                obj = getattr(obj, bit)
                        setting = bits[-1]
                    elif "radiomode" == name:
                        obj = _radio
                        setting = element.get_name()
                        match int(element.value):
                            case 0:  # ham
                                self._ham = True
                                _settings.gmrs = 0b0
                                _settings.ham = 0b1
                            case 1:  # gmrs
                                self._gmrs = True
                                _settings.gmrs = 0b1
                                _settings.ham = 0b0
                            case 2:  # normal
                                self._ham = False
                                self._gmrs = False
                                _settings.gmrs = 0b0
                                _settings.ham = 0b0
                    elif name == "ssidekey1" and self.MODEL in H3_PLUS_LIST:
                        _press.lsidekey3 = 0x00 if int(element.value) > 5 \
                            else _press.lsidekey3
                    elif name == "lsidekey3" and self.MODEL in H3_PLUS_LIST:
                        _press.lsidekey3 = 0x00 if _press.ssidekey1 > 5 \
                          else int(element.value)
                    elif name == "ssidekey2" and self.MODEL in H3_PLUS_LIST:
                        _press.lsidekey4 = 0x00 if _press.ssidekey2 > 5 \
                            else _press.lsidekey4
                    elif name == "lsidekey4" and self.MODEL in H3_PLUS_LIST:
                        _press.lsidekey4 = 0x00 if _press.ssidekey2 > 5 \
                          else int(element.value)
                    elif name in PRESS_NAME:
                        obj = _press
                        setting = element.get_name()
                    elif name == "btstatus":
                        obj = _bluetooth
                        setting = element.get_name()
                    elif (name.startswith("low") or
                            name.startswith("mid") or
                            name.startswith("hig")) and len(name) == 6:
                        obj = _powertune
                        setting = element.get_name()
                    elif name in VFOA_NAME:
                        obj = _vfoa
                        setting = element.get_name()
                    elif name == "ofseta":
                        obj = _aoffset
                        setting = element.get_name()
                    elif name == "rxtone":
                        _vfoa.rxtone = \
                            self._encode_vfo_tone(str(element.value))
                    elif name == "txtone":
                        _vfoa.txtone = \
                            self._encode_vfo_tone(str(element.value))
                    elif name == "rxtoneb":
                        _vfob.rxtoneb = \
                            self._encode_vfo_tone(str(element.value))
                    elif name == "txtoneb":
                        _vfob.txtoneb = \
                            self._encode_vfo_tone(str(element.value))
                    elif name == "astep":
                        _settings.astep = int(element.value)
                    elif name == "bstep":
                        _settings.bstep = int(element.value)
                    elif name in VFOB_NAME:
                        obj = _vfob
                        setting = element.get_name()
                    elif name == "ofsetb":
                        obj = _boffset
                        setting = element.get_name()
                    elif "block" in name:
                        obj = _fmmode
                        setting = element.get_name()
                    elif "fmvfo" in name:
                        obj = self._memobj.fmvfo
                        setting = element.get_name()
                    elif "gcode" in name:
                        obj = self._memobj.groupcode.gcode
                        setting = element.get_name()
                    elif "idcode" in name:
                        obj = self._memobj.icode.idcode
                        setting = element.get_name()
                    elif "scode" in name:
                        obj = self._memobj.startcode.scode
                        setting = element.get_name()
                    elif "ecode" == name:
                        obj = self._memobj.endcode.ecode
                        setting = element.get_name()
                    elif "group1" in name:
                        obj = self._memobj.group1.group1
                        setting = element.get_name()
                    elif "group2" in name:
                        obj = self._memobj.group2.group2
                        setting = element.get_name()
                    elif "group3" in name:
                        obj = self._memobj.group3.group3
                        setting = element.get_name()
                    elif "group4" in name:
                        obj = self._memobj.group4.group4
                        setting = element.get_name()
                    elif "group5" in name:
                        obj = self._memobj.group5.group5
                        setting = element.get_name()
                    elif "group6" in name:
                        obj = self._memobj.group6.group6
                        setting = element.get_name()
                    elif "group7" in name:
                        obj = self._memobj.group7.group7
                        setting = element.get_name()
                    elif "group8" in name:
                        obj = self._memobj.group8.group8
                        setting = element.get_name()
                    elif "micgain" in name:
                        obj = self._memobj.mic.micgain
                        setting = element.get_name()
                    elif "rpste" in name:
                        obj = self._memobj.rpt
                        setting = element.get_name()
                    elif "rptrl" in name:
                        obj = self._memobj.rpt
                        setting = element.get_name()
                    elif "killcode" in name:
                        obj = self._memobj.skcode.killcode
                        setting = element.get_name()
                    elif "stuncode" in name:
                        obj = self._memobj.skcode.stuncode
                        setting = element.get_name()
                    else:
                        obj = _settings
                        setting = element.get_name()
                    if element.has_apply_callback():
                        LOG.debug("Using apply callback")
                        element.run_apply_callback()
                    elif "sync" == name:
                        _settings.sync = not int(element.value)
                    # Channel A
                    elif "rxfreqa" == setting and element.value.get_mutable():
                        val = int(str(element.value).replace(
                            '.', '').ljust(8, '0'))
                        if (val >= 13600000 and val <= 17400000) or \
                                (val >= 40000000 and val <= 52000000) or \
                                (_settings.tx220 and val >= 22000000 and
                                 val <= 22500000):
                            setattr(obj, setting, val)
                        else:
                            msg = (
                                "Frequency must be between "
                                "136.00000-174.00000 or 400.00000-520.00000 "
                                "or enabled in settings")
                            raise InvalidValueError(msg)

                        def normalize_offset(value):
                            if '.' in str(value):
                                val = str(value).replace(' ', '')
                                if len(
                                    val[val.index(".") + 1:]
                                    ) >= 1 and int(val[val.index(".") + 1:]
                                                   ) != 0:
                                    match len(val[:val.index('.')]):
                                        case 0:
                                            val = '000' + \
                                                val.replace('.', '')
                                        case 1:
                                            val = '00' + \
                                                val.replace('.', '')
                                        case 2:
                                            val = '0' + \
                                                val.replace('.', '')
                                else:
                                    match len(val[:val.index('.')]):
                                        case 0:
                                            val = '000' + \
                                                val.replace('.', '00')
                                        case 1:
                                            val = '00' + \
                                                val.replace('.', '00')
                                        case 2:
                                            val = '0' + \
                                                val.replace('.', '00')
                                val = val.ljust(8, '0')
                            else:
                                match len(value.replace(' ', '')):
                                    case 0:
                                        val = '0'
                                    case 1:
                                        val = '00' + \
                                            str(value).replace(' ', '')
                                    case 2:
                                        val = '0' + \
                                            str(value).replace(' ', '')
                                val = val.ljust(8, '0')
                            return val

                        def calc_txfreq(rxfreq, offset, dir):
                            # calc tx freq
                            txfreq = 0
                            match dir:
                                case 0:  # off
                                    txfreq = rxfreq
                                case 1:  # minus
                                    txfreq = \
                                        (int(rxfreq) /
                                            100000 - offset) * 100000
                                case 2:  # plus
                                    txfreq = \
                                        (int(rxfreq) /
                                            100000 + offset) * 100000
                            return txfreq

                        def encode_offset(offset):
                            lenth_val = 0
                            list_val = []
                            while lenth_val < (len(offset)):
                                list_val.insert(
                                    0, offset[lenth_val:lenth_val + 2])
                                lenth_val += 2
                            for i in range(len(list_val)):
                                list_val[i] = int(list_val[i], 16)
                            return list_val

                    elif "ofseta" == setting and element.value.get_mutable():
                        val = normalize_offset(str(element.value))
                        if (int(val) >= 0 and int(val) <= 5999750):
                            if int(val) == 0:
                                _aoffset.ofseta = [0xFF, 0xFF, 0xFF, 0xFF]
                                _vfoa.txfreqa = int(self._memobj.vfoa.rxfreqa)
                            else:
                                _aoffset.ofseta = encode_offset(val)
                                # calc tx freq and store
                                _vfoa.txfreqa = \
                                    calc_txfreq(
                                        _vfoa.rxfreqa,
                                        float(element.value),
                                        int(
                                            settings._elements['offset'].value
                                        )
                                    )
                        else:
                            msg = ("Offset must be between 0.00000-59.99750")
                            raise InvalidValueError(msg)

                    # B channel
                    elif "rxfreqb" == setting and element.value.get_mutable():
                        val = 0
                        val = int(str(element.value).replace(
                            '.', '').ljust(8, '0'))
                        if (val >= 13600000 and val <= 17400000) or \
                                (val >= 40000000 and val <= 52000000) or \
                                (_settings.tx220 and val >= 22000000 and
                                 val <= 22500000):
                            setattr(obj, setting, val)
                        else:
                            msg = (
                                "Frequency must be between "
                                "136.00000-174.00000 or 400.00000-520.00000 "
                                "or enabled in settings")
                            raise InvalidValueError(msg)

                    elif "ofsetb" == setting and element.value.get_mutable():
                        val = normalize_offset(str(element.value))
                        if (int(val) >= 0 and int(val) <= 5999750):
                            if int(val) == 0:
                                _boffset.ofsetb = [0xFF, 0xFF, 0xFF, 0xFF]
                                _vfob.txfreqb = int(self._memobj.vfob.rxfreqb)
                            else:
                                _boffset.ofsetb = encode_offset(val)
                                # calc tx freq and store
                                _vfob.txfreqb = \
                                    calc_txfreq(
                                        _vfob.rxfreqb,
                                        float(element.value),
                                        int(
                                            settings._elements['offsetb'].value
                                        )
                                    )
                        else:
                            msg = ("Offset must be between 0.00000-59.99750")
                            raise InvalidValueError(msg)

                    # FM
                    elif "block" in name:
                        num = int(name[-2:], 10)
                        val = str(element.value)
                        if val.strip():
                            try:
                                val = int(float(val) * 10)
                            except ValueError:
                                raise InvalidValueError(
                                    'Value must be between 76.0-108.0')
                            fm_validate(val)
                        else:
                            val = 0
                        self._memobj.fmmode[num].fmblock = val
                        self._memobj.fmusedflags[num] = bool(val)

                    elif 'fmvfo' == setting and element.value.get_mutable():
                        self._memobj.fmvfo = int(element.value * 10)

                    elif 'gcode' == setting and element.value.get_mutable():
                        self._memobj.groupcode.gcode = element.value

                    elif 'icode' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.icode.idcode = \
                            self._encode_dtmf(val, False)

                    elif 'scode' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.startcode.scode = \
                            self._encode_dtmf(val.ljust(15, ' '), True)

                    elif 'ecode' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.endcode.ecode = \
                            self._encode_dtmf(val.ljust(15, ' '), True)

                    elif 'group1' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group1.group1 = self._encode_dtmf(val)

                    elif 'group2' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group2.group2 = self._encode_dtmf(val)

                    elif 'group3' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group3.group3 = self._encode_dtmf(val)

                    elif 'group4' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group4.group4 = self._encode_dtmf(val)

                    elif 'group5' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group5.group5 = self._encode_dtmf(val)

                    elif 'group6' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group6.group6 = self._encode_dtmf(val)

                    elif 'group7' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group7.group7 = self._encode_dtmf(val)

                    elif 'group8' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.group8.group8 = self._encode_dtmf(val)

                    elif setting == 'micgain':
                        self._memobj.mic.micgain = (
                            str(element.value))
                    elif 'stuncode' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.skcode.stuncode = self._encode_dtmf(val)
                    elif 'killcode' == setting and element.value.get_mutable():
                        val = str(element.value)
                        self._memobj.skcode.killcode = self._encode_dtmf(val)
                    elif element.value.get_mutable():
                        setattr(obj, setting, element.value)
                except Exception:
                    LOG.debug(element.get_name())
                    raise

    def _set_fm_preset(self, settings):
        for element in settings:
            try:
                val = element.value
                if self._memobj.fm_presets <= 108.0 * 10 - 650:
                    value = int(val.get_value() * 10 - 650)
                else:
                    value = int(val.get_value() * 10)
                LOG.debug("Setting fm_presets = %s" % (value))
                self._memobj.fm_presets = value
            except Exception:
                LOG.debug(element.get_name())
                raise

    def get_tx_bands(self):
        return self._txbands

    def validate_memory(self, mem):
        msgs = []
        if chirp_common.in_range(mem.freq, self._airband) and \
                not mem.mode == 'AM':
            msgs.append(chirp_common.ValidationWarning(
                _('Frequency in this range requires AM mode')))
        if not chirp_common.in_range(mem.freq, self._airband) and \
                mem.mode == 'AM':
            msgs.append(chirp_common.ValidationWarning(
                _('Frequency in this range must not be AM mode')))
        if (not chirp_common.in_range(mem.freq, self.get_tx_bands()) and
                mem.duplex != 'off'):
            msgs.append(chirp_common.ValidationWarning(
                _('Frequency outside TX bands must be duplex=off')))
        return msgs + super().validate_memory(mem)


@directory.register
@directory.detected_by(TDH8)
class TDH8_HAM(TDH8):
    VENDOR = "TIDRADIO"
    MODEL = "TD-H8-HAM"
    ident_mode = b'P31185\xff\xff'
    _ham = True
    _rxbands = [(136000000, 143999000), (149000001, 174000000),
                (400000000, 419999000), (451000001, 521000000)]
    _txbands = [(144000000, 149000000), (420000000, 451000000)]


@directory.register
@directory.detected_by(TDH8)
class TDH8_GMRS(TDH8):
    VENDOR = "TIDRADIO"
    MODEL = "TD-H8-GMRS"
    ident_mode = b'P31184\xff\xff'
    _gmrs = True
    _txbands = [(136000000, 175000000), (400000000, 521000000)]
    _tx_power = [chirp_common.PowerLevel("Low", watts=1.00),
                 chirp_common.PowerLevel("High", watts=8.00)]

    def validate_memory(self, mem):
        msgs = super().validate_memory(mem)
        if 31 <= mem.number <= 54:
            if mem.freq not in GMRS_FREQS:
                msgs.append(chirp_common.ValidationError(
                    "The frequency in channels 31-54 must be between "
                    "462.55000-467.71250 in 0.025 increments."))
            if mem.duplex not in ('', '+', 'off') or (
                    mem.duplex == '+' and mem.offset != 5000000):
                msgs.append(chirp_common.ValidationError(
                    "Channels in this range must be GMRS frequencies and "
                    "either simplex or +5MHz offset"))
        return msgs


@directory.register
class UV68(TDH8):
    VENDOR = "TID"
    MODEL = "TD-UV68"


@directory.register
class TDH3(TDH8):
    VENDOR = "TIDRADIO"
    MODEL = "TD-H3"
    _memsize = 0x1fef
    _ranges_main = [(0x0000, 0x1fef)]
    _idents = [TD_H3]
    _txbands = [(136000000, 600000000)]
    _airband = [(108000000, 135999999)]
    _rxbands = [(18000000, 107999000)] + _airband
    _aux_block = True
    _tri_power = True
    _gmrs = False
    _ham = False
    _mem_params = (0x1F2F)
    _tx_power = [chirp_common.PowerLevel("Low",  watts=2.00),
                 chirp_common.PowerLevel("High",  watts=5.00)]
    _roger_list = ["Off", "TONE1", "TONE2"]
    _brightness_map = [("1", 4), ("2", 3), ("3", 2), ("4", 1), ("5", 0)]
    _mic_gain_list = ['%02d' % x for x in range(0, 10)]
    _steps = [2.5, 5.0, 6.25, 10.0, 12.5, 25.0, 50.0, 8.33]
    _step_list = ['%2.2fK' % x for x in _steps]
    _scramble_list = ["Off"] + ['%02d' % x for x in range(1, 17)]

    def process_mmap(self):
        self._memobj = bitwise.parse(MEM_FORMAT_H3, self._mmap)

    def get_features(self):
        rf = super().get_features()
        rf.valid_modes = ["FM", "NFM", "AM"]  # 25 kHz, 12.5 kHz, AM.
        rf.valid_tuning_steps = self._steps
        return rf


@directory.register
@directory.detected_by(TDH3)
class TDH3_HAM(TDH3):
    VENDOR = "TIDRADIO"
    MODEL = "TD-H3-HAM"
    ident_mode = b'P31185\xff\xff'
    _ham = True
    _txbands = [(144000000, 149000000), (420000000, 451000000)]
    _rxbands = [(18000000, 107999000), (108000000, 136000000),
                (149990000, 419990000), (451000000, 600000000)]
    _tx220 = [(222000000, 225000000)]
    # leave out 219-220 sub-band because this radio doesn't do
    # fixed digital message forwarding
    # tx350 and tx500 bands unknown; add them if you are in a
    # legal locale and know their correct range

    def get_tx_bands(self):
        _settings = self._memobj.settings
        bands = []
        bands.extend(self._txbands)
        if _settings.tx220:
            bands.extend(self._tx220)
        return bands


@directory.register
@directory.detected_by(TDH3)
class TDH3_GMRS(TDH3):
    VENDOR = "TIDRADIO"
    MODEL = "TD-H3-GMRS"
    ident_mode = b'P31184\xff\xff'
    _gmrs = True
    _txbands = [(136000000, 175000000), (400000000, 521000000)]

    def validate_memory(self, mem):
        msgs = super().validate_memory(mem)
        if 31 <= mem.number <= 54 and mem.freq not in GMRS_FREQS:
            msgs.append(chirp_common.ValidationError(
                "The frequency in channels 31-54 must be between"
                "462.55000-462.72500 in 0.025 increments."))
        return msgs


@directory.register
class TDH3_Plus(TDH3):
    MODEL = "TD-H3-Plus"
    _ponmsg_list = ["Voltage", "Message", "Picture"]
    _save_list = ["Off", "Level 1(1:1)", "Level 2(1:2)",
                  "Level 3(1:3)", "Level 4(1:4)"]
    _lang_map = [("Chinese", 0), ("English", 1)]
    _short_key_map = [("None", 0), ("FM Radio", 1), ("Lamp", 2),
                      ("TONE", 4), ("Alarm", 5), ("Weather", 6),
                      ("PTT2", 7), ("OD PTT", 8)]
    _steps = [2.5, 5.0, 6.25, 10.0, 12.5, 25.0, 50.0, 0.5, 8.33]
    _step_list = ['%.3gK' % x for x in _steps]
    _fmrec_shortname = "FM Interrupt"
    LONG_KEY_LIST = ["None", "FM Radio", "Lamp", "Cancel Sq",
                     "TONE", "Alarm", "Weather"]

    _code_list_dcsn = ["%03iN" % x for x in TDH8._dcs]
    _code_list_dcsi = ["%03iI" % x for x in TDH8._dcs]
    _code_list = TDH8._code_list_ctcss + _code_list_dcsn + _code_list_dcsi
    _scramble_list = ["Off"] + ['%2d' % x for x in range(1, 17)]
    _txbands = [(136000000, 199998750), (400000000, 600000000)]
    _mil_airband = [(220000000, 399998750)]
    _airband = TDH3._airband + _mil_airband
    _rxbands = TDH3._rxbands + _airband

    def get_features(self):
        rf = super().get_features()
        rf.valid_modes = ["FM", "NFM", "AM"]  # 25 kHz, 12.5 kHz, AM.
        rf.valid_tuning_steps = self._steps
        return rf


@directory.register
@directory.detected_by(TDH3_Plus)
class TDH3_Plus_HAM(TDH3_HAM, TDH3_Plus):
    MODEL = "TD-H3-Plus-HAM"


@directory.register
@directory.detected_by(TDH3_Plus)
class TDH3_Plus_GMRS(TDH3_GMRS, TDH3_Plus):
    MODEL = "TD-H3-Plus-GMRS"


@directory.register
class RT730(TDH8):
    VENDOR = "Radtel"
    MODEL = "RT-730"
    _memsize = 0x6400
    _ranges_main = [(0x0000, 0x6400)]
    _idents = [RT_730]
    _txbands = [(136000000, 174000000), (174000000, 300000000),
                (300000000, 400000000), (400000000, 520000000),
                (520000000, 630000000)]
    _airband = [(108000000, 135975000)]
    _rxbands = [(10000000, 108000000)] + _airband
    _tri_power = True
    _gmrs = False
    _ham = False
    _lang_map = [("Chinese", 0), ("English", 1)]

    def process_mmap(self):
        self._memobj = bitwise.parse(MEM_FORMAT_RT730, self._mmap)
