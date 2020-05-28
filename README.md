# iPath3 miner

Mining all targets with their chinese_id listed in miner.tsv file. A sub project for (SuperTCM)[1]

## What in the box

- **server.js**: software it self
- **miner.tsv**: prepared file preprocessed file ((Link)[2]) from ipath3_map_target.csv with google sheet. ("" remove / title line remove / sort according to chinese_id)
- **ipath3_map_target.csv**: file give by Qiaofeng

# How to start

```
node server.js
```

[1]: http://bioinf-applied.charite.de/supertcm/
[2]: https://docs.google.com/spreadsheets/d/1NvHQ8DSuJwGE2dVr_JMmbtC5_qs5eum8oV16BARZ_vI/edit?usp=sharing