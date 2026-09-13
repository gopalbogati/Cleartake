import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('scan',Path(__file__).resolve().parents[1]/'engine/audio_scan.py')
scan=importlib.util.module_from_spec(spec);spec.loader.exec_module(scan)
class SoundReview(unittest.TestCase):
    def test_high_confidence_can_be_suggested(self):
        self.assertTrue(scan.select_events([[.9,.01]],['Sneeze','Speech'],1)[0]['suggested'])
    def test_nearby_speech_requires_review(self):
        events=scan.select_events([[.01,.9],[.9,.01]],['Sneeze','Speech'],2)
        self.assertFalse(events[0]['suggested']);self.assertTrue(events[0]['voiceNearby'])
    def test_uncertain_and_non_events(self):
        self.assertFalse(scan.select_events([[.3,.01]],['Cough','Speech'],1)[0]['suggested'])
        self.assertEqual(scan.select_events([[.05,.8]],['Cough','Speech'],1),[])
    def test_merge_is_conservative(self):
        events=scan.select_events([[.9,.01],[.4,.01]],['Cough','Speech'],2)
        self.assertEqual(len(events),1);self.assertFalse(events[0]['suggested'])
if __name__=='__main__':unittest.main()
