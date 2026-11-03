# Step 4 lock

Locked 2026-11-03, after the walk ended (`done` at 2026-11-03T12:52:41Z). `<data>` = `.evidence/bench` (gitignored, in the main checkout). Plan: `docs/plans/2026-11-02-bench-external.md`, Task 5; rulings: prereg section 4.2, rulings 1-15 and the dated sentences added to ruling 10 during the walk. The sample is the 24 accepted rows of `walk.tsv` in sort order per stack (`progress/step4/sample.tsv`; full SHAs, URLs and issue numbers are there). Nothing here was read from `raw/`, from the content of `sealed/` or of `tasks/*/issue.json`, or from a recipe-agent reply; those files are only hashed.

## Sample

| task | id | rank | method | f2p | edit history | platform | cold setup |
|---|---|---|---|---|---|---|---|
| s1-01 | django-commons/django-debug-toolbar#2502 | 1 | squash | 2 | none | linux/arm64 | no |
| s1-02 | fossasia/eventyay#4689 | 2 | squash | 1 | none | linux/arm64 | no |
| s1-03 | openfoodfoundation/openfoodnetwork#14719 | 3 | merge | 24 | none | linux/arm64 | no |
| s1-04 | Open-Source-Legal/OpenContracts#2124 | 5 | merge | 23 | none | linux/arm64 | no |
| s1-05 | netbox-community/netbox#23175 | 6 | squash | 2 | none | linux/arm64 | no |
| s1-06 | paperless-ngx/paperless-ngx#13486 | 8 | single | 23 | none | linux/arm64 | yes |
| s1-07 | netbox-community/netbox#23277 | 9 | single | 3 | none | linux/arm64 | no |
| s1-08 | Open-Source-Legal/OpenContracts#2371 | 11 | merge | 5 | none | linux/arm64 | no |
| s2-01 | RunMaestro/Maestro#1783 | 1 | single | 8 | none | linux/arm64 | no |
| s2-02 | coder/xum#7059 | 2 | squash | 66 | none | linux/arm64 | no |
| s2-03 | CherryHQ/cherry-studio#19874 | 4 | squash | 1 | none | linux/arm64 | no |
| s2-04 | coder/xum#5191 | 5 | squash | 32 | none | linux/arm64 | no |
| s2-05 | CherryHQ/cherry-studio#18688 | 6 | single | 1 | none | linux/arm64 | no |
| s2-06 | OpenWhispr/openwhispr#2643 | 11 | squash | 21 | none | linux/arm64 | no |
| s2-07 | IsmaelMartinez/teams-for-linux#2778 | 12 | squash | 13 | none | linux/arm64 | no |
| s2-08 | super-productivity/super-productivity#11313 | 13 | single | 2 | none | linux/arm64 | yes |
| s3-01 | voidzero-dev/vite-plus#2667 | 2 | squash | 2 | none | linux/arm64 | no |
| s3-02 | tokio-rs/toasty#1238 | 4 | single | 5 | none | linux/arm64 | no |
| s3-03 | rust-lang/cargo#17562 | 5 | merge | 5 | none | linux/arm64 | no |
| s3-04 | lancedb/lancedb#4486 | 8 | squash | 21 | none | linux/arm64 | no |
| s3-05 | nautechsystems/nautilus_trader#4813 | 9 | single | 63 | none | linux/arm64 | no |
| s3-06 | pola-rs/polars#30060 | 11 | squash | 3 | none | linux/arm64 | no |
| s3-07 | pola-rs/polars#29923 | 14 | single | 3 | none | linux/arm64 | no |
| s3-08 | the-open-engine/zeroshot#944 | 16 | single | 1 | none | linux/arm64 | yes |

Cold-setup repo (ruling 13, `coldSetup`: the sampled repo whose best-ranked task ranks lowest): s1 `paperless-ngx/paperless-ngx`, s2 `super-productivity/super-productivity`, s3 `the-open-engine/zeroshot`. Every task is tier 1. Every issue has `editHistory` `none`. Every recipe is `linux/arm64`.

## Walk summary

`walk.tsv` is keyed by id, and the last row of an id counts. Every rank from 1 to the last checked rank of each stack has a row (no gap). No row's last result is `error` or `recheck`.

| stack | ok rows listed | last checked rank | checked (verdict) | ok | outs by reason | repo cap | not checked | repos in sample (max per repo) |
|---|---|---|---|---|---|---|---|---|
| s1 | 1198 | 11 | 10 | 8 | rebase merge of several commits 1, PR tests do not pass at end 1 | 1 | 1187 | 6 (2) |
| s2 | 2345 | 13 | 10 | 8 | rebase merge of several commits 2 | 3 | 2332 | 6 (2) |
| s3 | 7063 | 16 | 16 | 8 | PR tests do not pass at end 3, recipe failed 2, out of memory 1, no fail-to-pass test 1, rebase merge of several commits 1 | 0 | 7047 | 7 (2) |

- `check` ran 54 times over 36 candidates (`meta.json` `attempt`s, counting errors and rechecks). There were 49 recipe-agent runs, all exit 0.
- No out was caused by the mapping `no PR test file at the end -> PR tests do not pass at end`. Every `PR tests do not pass at end` candidate (s3: swc#12010, panda#3925, iggy#4018; s1: eventyay#4509) has base and end runs in `meta.json`.
- The s3 `PR tests do not pass at end` outs gave 0 JUnit cases in every run: swc and panda exited 1, and iggy exited 94. eventyay#4509 ran 6 cases. See "Open points".

## Used in hstack (ruling 12)

For each of the 19 sampled repos, `rg -l -i -F --hidden --glob '!.git/**' '<owner>/<repo>' .` was run over this repo (the worktree at the lock commit). The same `rg -l -i -F --hidden '<owner>/<repo>'` was run over every top-level entry of `<data>` except `ext/` and `heldout/`. In this repo the only hits are the selection records `progress/step4/candidates-1.tsv` and `progress/step4/repos-1.tsv`; `vite-plus` is also named in `progress/progress.md`, in the walk notes. In `<data>` outside `ext/` there are no hits. No sampled repo was used in hstack.

## Clones

All 27 clones under `<data>/ext/repos/` are bare (`git rev-parse --is-bare-repository` = `true`) and hold only the bare repository's files. None has a work tree.

## Events and rulings of the walk, in order

Driver `<data>/ext/walk-all.sh`: s3, s2, s1 in turn, tier 1, `--remove-out`, each walk between equal `pgsnap` snapshots (no change was found). PIDs, start times and commits are in `progress/progress.md`.

1. 2026-11-02T23:52Z, start at 911b1bf. s3 rank 1, `apache/datafusion#24211`: the base run was OOMKilled twice, giving `error run` twice, and the walk stopped on 2 errors in a row (00:08Z).
2. Ruling (805b256): a test run killed for memory is the out reason `out of memory`, after `end build failed`. The recipe brief states the container's memory and CPUs. A probe killed for memory counts as a failed probe. Restart at 00:14Z: datafusion#24211 `out of memory` (the only one in the walk); vite-plus#2667 `PR tests do not pass at end`.
3. Sealed diagnosis 1 of vite-plus (one letter: `A`, the script was given a path it cannot run). Probe change (3bf255e): each probe also runs one base file under the test paths with an extension no probe file has, and the brief says the arguments can include test data. A `recheck: <reason>` row reopens an out row, and no earlier row is edited. vite-plus got `recheck: probe change`. Its recheck (after item 4) reused the old recipe and was out again.
4. The user's decision (9546c4a): Docker keeps 7.6 GB and 8 CPUs on this 32 GB machine; a repo whose tests need more memory is `out of memory`, and every such out is reported to the user.
5. `briefSha` (58fd469): a saved recipe written under another brief is regenerated before use. Sealed diagnosis 2 of vite-plus (structured): 4 arguments, none with a probe extension, none runnable, the script ran nothing. Owning-tests rule (dc62bb7): when no argument is a runnable test file, the script runs the tests that own them. vite-plus got `recheck: owning tests`, then `ok` (01:25Z).
6. Review fix (1e0b47b): a stale recipe is never built, and with no round left the candidate is `recipe failed`. The repo's first task keeps its 3 rounds.
7. Paused at 05:28Z, when `end build failed` was 5 of 11 s3 checks. Five sealed diagnoses (s3 ranks 4, 5, 9, 10, 11) all said `disk`. One `docker run --rm --network none alpine:3.22 df -h /` measured Docker's VM disk (58.4 GB, 0 free); it was the only container made for measuring. The user's decision (404231b): a full Docker disk is the machine's failure; the walk stops when the disk is low; clearing the build cache is allowed; accepted tasks keep their recipe and image digests, not their images. `docker builder prune -f` freed 19.86 GB. The images of vite-plus and lancedb were removed after their digests were recorded. `recheck: disk` went to s3 ranks 3, 4, 5, 6, 7, 9, 10, 11.
8. Ruling: recipe rounds spent while the disk was full are not counted. rocketmq-rust's `rounds.tsv` was moved to `rounds-before-disk-fix.tsv`, so its recheck had 3 rounds again (it was `recipe failed` again). From d9bf894 the driver runs `docker builder prune -f` once when a walk stops on low disk.
9. Review fix (ea48116): a disk-full message counts as the machine's failure only when the disk is then below the 15 GB floor. The estimate counts 90% of the disk limit as usable. An accepted image with no digest is kept. The controller restarted at 06:38Z (code ea48116).
10. At 09:23:58Z s3 stopped on low disk (6.5 GB free). The driver's prune freed 42.92 GB and the s3 walk went on. s3 reached 8 at 09:48Z, s2 at 10:35Z, s1 at 12:52Z.

## Hashes

`shasum -a 256`; paths relative to `<data>`. `raw/` still matches `raw.sha256`: `cd <data>/ext && find raw -type f | sort | xargs shasum -a 256` is byte-identical to `raw.sha256`, 5611 files. `groups.json`, `candidates-1.tsv`, `repos-1.tsv` and `raw.sha256` have the same hashes as at the list commit (5210606). The committed copies:

```
61b34b59223b53b8a9aaa58eb5452c1eb0455c6e33310e348b05e2d9c6f73b61  progress/step4/sample.tsv
300549ffdaabac832ae27794d86075c666492ec431772da7edf3002ff048ba2b  progress/step4/walk.tsv
75e7ac6fe1463ba4b0347afe24f203876e18bfbf50d038a1d619763c96c69c95  progress/step4/candidates-1.tsv
fe474f93352c04f24da6efc9a43ccf6660ac3a5b355683539cde5c659de7e4ee  progress/step4/repos-1.tsv
```

The data files (36 `meta.json`, 32 `issue.json`, 24 `recipe.json`, 340 files under `sealed/`, whose names are tool labels only):

```
fcbc35b8a29ea8ad43b47c13f45f512debaaa7c78ca94f8532af6a76b1572aa8  ext/groups.json
75e7ac6fe1463ba4b0347afe24f203876e18bfbf50d038a1d619763c96c69c95  ext/candidates-1.tsv
fe474f93352c04f24da6efc9a43ccf6660ac3a5b355683539cde5c659de7e4ee  ext/repos-1.tsv
300549ffdaabac832ae27794d86075c666492ec431772da7edf3002ff048ba2b  ext/walk.tsv
92b6b2996a6ba4d3594060df27a0d77b9cb0058e790ef396d9ed4e01075fec04  ext/raw.sha256
d7e9da147f1e1d0ff50ccfe928411dcd4f68747a579dcf9d52d6d958fc16e1d2  ext/recipes/apache__datafusion/recipe.json
01a33c682a700f9bf1987bb8a07b0d06fe96120b945404cee20789f1ec4b4ebc  ext/recipes/apache__iggy/recipe.json
71b12adbc73c897d51715f08b9c923d843b6170801a8a20415e5ec4e8ec693f0  ext/recipes/chakra-ui__panda/recipe.json
e750383a3eff3ca4220fb63114f91cd19a0938035575f96808f17d3e3fe9071c  ext/recipes/cherryhq__cherry-studio/recipe.json
a3bc5a1b8649d9505a2693d94829a51f069b0037203eadf8b263e391ba4c2e0f  ext/recipes/coder__xum/recipe.json
e2e587375798cbb861ebb5c6727398a1ce435126651cf73ccc00ddbed709fa4c  ext/recipes/django-commons__django-debug-toolbar/recipe.json
d85e9a2e746bf544080685beaea30caebcc600459b99e4ff2f78487a6461f9ed  ext/recipes/fossasia__eventyay/recipe.json
a5c93f867b4b97f421e23b50178a1068d3952f9218d19447a2c3e4548e1f194b  ext/recipes/ismaelmartinez__teams-for-linux/recipe.json
f907d39abd2fcfd0fad1ed02cb445f209860cd783598b9d3a5a9df48c5b1096a  ext/recipes/lancedb__lancedb/recipe.json
6f672adb2cff9672820055b6776cf27620e49651832202622af57fb88206b27b  ext/recipes/nautechsystems__nautilus_trader/recipe.json
335dd511afc804102b8f40e9b109060686f75afabe73c3e2259102df54417cd2  ext/recipes/netbox-community__netbox/recipe.json
f290e9fcb3ac29300cd70b15bbe662c2b53fb6f9a3d798f4a3d6faf89b250a92  ext/recipes/open-source-legal__opencontracts/recipe.json
1e6f4832f46f3d08198f67b3eadcb36c9edc91998da0349340cdebde13d61da9  ext/recipes/openfoodfoundation__openfoodnetwork/recipe.json
a406effd40245466b19cc391ca198a849a32810cb672e4eaa8f50423ccf822fd  ext/recipes/openwhispr__openwhispr/recipe.json
711d1b6e6022bc563b39dc851b613c79323bb4131eacd316b18cb6b4803cd01c  ext/recipes/paperless-ngx__paperless-ngx/recipe.json
9c88a4c7278b37cfb8e61160d79c754a99aac5b8095f3a887921c48a8139acee  ext/recipes/pola-rs__polars/recipe.json
4d0d6970e56ac3c5833d677a80c2ea977119442d723c2572a7d5531a78159e99  ext/recipes/runmaestro__maestro/recipe.json
302bdbc51b2304e327680a97df31c7566f7a0e3b4e30060d3755ae3544e72f20  ext/recipes/rust-lang__cargo/recipe.json
49586b8deb47f6703236f32ea719f4628961f4529efa0e3b2f32ffad06314323  ext/recipes/servo__servo/recipe.json
020d5dcc04d507b76dbfa217bbf69dfeb264da6d909c0765d3402d90778b9374  ext/recipes/super-productivity__super-productivity/recipe.json
36dd0e5c05012ad6e4f88adce1f2ea43a88321f0352b041c2ce065b0f5430748  ext/recipes/swc-project__swc/recipe.json
1387bdcb80cee41820eed2b3e48244f0f796315e53029e137ac9bc08e52d6a48  ext/recipes/the-open-engine__zeroshot/recipe.json
18e8a2b3fc2e666748bfe1c448977716f3ce69d703ac1d5f6b6d206ac0bed818  ext/recipes/tokio-rs__toasty/recipe.json
042797f9d2436efee36de7efd9e178e6391584510bfae7326e8cbaf083534ace  ext/recipes/voidzero-dev__vite-plus/recipe.json
bd792927144b21fdb41d90465dc7e3c96e827eace3036e648d7d21a789416219  ext/tasks/apache__datafusion__24211/issue.json
59bba9a225e799594ae6a02e6753f1dd46aaad9a32d836226fcea11c232b7a01  ext/tasks/apache__datafusion__24211/meta.json
d82fe04abf0fd7270d846b328a58016d2b0f3fe27f7eeacc8877dc73e1f02b10  ext/tasks/apache__datafusion__24354/issue.json
b5ddaafe05ae58c8bfae8fb70c3c7ae97b06c35f278502cc6e66c97d2826b064  ext/tasks/apache__datafusion__24354/meta.json
8c87b4485942c76e0178dc3c9b6bd789d9d09b2584fe9990a859aedae720eae9  ext/tasks/apache__iggy__4018/issue.json
27c58ef845d6876419d19339b3ed7cbec5e7412db0e2c34bbf5809439c76378a  ext/tasks/apache__iggy__4018/meta.json
c5812190ec0a48ec967e12fb2ac00301a8bbaf5c5bc8b0ed2b06e45dec04a946  ext/tasks/chakra-ui__panda__3925/issue.json
9f75a7af5dff9d329eb685f203bc84608b7a6020de0a7f8f5a063fdab2f0e972  ext/tasks/chakra-ui__panda__3925/meta.json
7ed93bf8f0a4bf9ee6a87a29ec45e956cc763e5767e441a88f1f54fdf7bf3c43  ext/tasks/cherryhq__cherry-studio__18688/issue.json
e084d0d382dc31088d244726ec661402cd49f1856eed0a7b8b66ad83e7bb32be  ext/tasks/cherryhq__cherry-studio__18688/meta.json
6b920bba6a831f8837e70b48b83a0d69be5f7197bb11ec56a91bca22025e19f8  ext/tasks/cherryhq__cherry-studio__19874/issue.json
b87a78a532984e171fb79cf335f479ed13432d7a33363d4bd44ab52aa595295f  ext/tasks/cherryhq__cherry-studio__19874/meta.json
42b03a856c373beef1a40ba1dc235500c9c071f670bef8c949d92d86ac43a921  ext/tasks/coder__xum__5191/issue.json
30ce3abea10f48ce9a038a7be8ea790cdfe1edd96031ae973e0ce8028221576c  ext/tasks/coder__xum__5191/meta.json
2a9b78178453a2dd58aaf16c28be8ed660bc03ad1f10b5c25483bd1b0e18344a  ext/tasks/coder__xum__7059/issue.json
38376f5187acc2441c05eb949a8e9dab5a61c88beefa142c2d23cf051b50e9de  ext/tasks/coder__xum__7059/meta.json
75e9324cf12d3fb0e0531725768856e91c6b2472ae42725c5a9e26d4f38550f1  ext/tasks/django-commons__django-debug-toolbar__2502/issue.json
56614bf70b047d9a981332950886b36f5c7cdfa1e259b1dae22b7dd307c3b8a7  ext/tasks/django-commons__django-debug-toolbar__2502/meta.json
30e2642fbfb7b5f1ab6b32b9b2997cb8509fff2510349581cd6e73841ac4b4c1  ext/tasks/fossasia__eventyay__4509/issue.json
62a6f9d4a1791654b1eae1f3078e270e1e7c6d9afca6503461478c8d01af015e  ext/tasks/fossasia__eventyay__4509/meta.json
60cb41363855486ee6f6ad52839e97f98f5d161ef03cfc9804ee4db73b3a048d  ext/tasks/fossasia__eventyay__4689/issue.json
420310350427e7dd6e852faa813878467c6e94586659bb66eb6d825f56ae4e3d  ext/tasks/fossasia__eventyay__4689/meta.json
707fa3058fc0d5e928392e90c753552fcd45fa345f9ef2e61923bcd428d6e7ef  ext/tasks/ismaelmartinez__teams-for-linux__2778/issue.json
1a93a369fbca7a430cc2bf83030c77cd34b9ad4ec0fe7445457578b5ce6ca8c7  ext/tasks/ismaelmartinez__teams-for-linux__2778/meta.json
36c219abac10798158c98ca207abdc5830092760c24e77db3ce209fb316820fd  ext/tasks/lancedb__lancedb__4486/issue.json
c6c39925cbf46d0671c52eb80348afc6f5e3e48a090b2767dca7aa755712ceaa  ext/tasks/lancedb__lancedb__4486/meta.json
8e41bbc7a7c6e2ff90742c28bf569cf9e56b1672ec6d09bac1d3b5c8d0525828  ext/tasks/mxsm__rocketmq-rust__9140/issue.json
794669b27e03908e899d8549567a21a1cdb61f1ac38c9416f132ee189d2a8c05  ext/tasks/mxsm__rocketmq-rust__9140/meta.json
ee1b81f28aefcb240ce141948283b484d2b20ed29dedc586dee4a1c15e4a2910  ext/tasks/nautechsystems__nautilus_trader__4813/issue.json
8c462776319c04d03bc5317cb17a8492d3c8b4650973bb3aeb94c5ebb1431d8d  ext/tasks/nautechsystems__nautilus_trader__4813/meta.json
e85b90d1839220e04d783d5c8373c61d409efd95333b488a2ff3a5c41e88f44f  ext/tasks/netbox-community__netbox__23175/issue.json
1c230370eed39a3d3dd309122f7aa390de47941d753a18f21c711605fbbf9b2b  ext/tasks/netbox-community__netbox__23175/meta.json
7725b2d60150fe23fc2cf80734f160647aea68e745353d4886fd574ecf258506  ext/tasks/netbox-community__netbox__23277/issue.json
76815ac514f2d3cec5d89934625b54a23985ea4d25120e21c2aaaae09d2efc41  ext/tasks/netbox-community__netbox__23277/meta.json
144060dbd2fbf35ebe03bd0248cf7ef4923599ff79c66b505b455a649c7c3b2d  ext/tasks/open-source-legal__opencontracts__2124/issue.json
77d97909f857b145ac7495a5d024c35e6bbc89c031739bc0960d181e211fc1c2  ext/tasks/open-source-legal__opencontracts__2124/meta.json
4e02022d8162c4c55e340937a796625e3225e87ecb34b4c04bf68296f1a3ebf6  ext/tasks/open-source-legal__opencontracts__2371/issue.json
81e3a590e732af04f3b03faa2c08e987c6a2898f0a1f46a8c039e4a4dee140d8  ext/tasks/open-source-legal__opencontracts__2371/meta.json
4d9a98d7e55a7d1af14ba0bf57e31795f222cb71ac547f909adee819f63c3bc9  ext/tasks/openfoodfoundation__openfoodnetwork__14719/issue.json
c5140a1082523144223b9f7390d04b21f89adc9942ad5427fb22294ef85ad3f9  ext/tasks/openfoodfoundation__openfoodnetwork__14719/meta.json
6aa93f627f5b5d66ccebed6c8efedcdfc8ddcd46ed13a287c72b2e58d5146723  ext/tasks/openwhispr__openwhispr__2643/issue.json
04ff4c9d651a4aea157e18ffdce547ff59daa6f91a84d4bfa5898ef8b4a4add8  ext/tasks/openwhispr__openwhispr__2643/meta.json
49493b7c225ff56c659641b3c7ec5c9c6cfe472c1dcc10b4c813aa3eb8775810  ext/tasks/paperless-ngx__paperless-ngx__13486/issue.json
4b0c0bee62a513c3c4c3a23705036ed23c213e8bf8b8b2fd49756ad3b29ccd04  ext/tasks/paperless-ngx__paperless-ngx__13486/meta.json
e7f86dc47adee5b03a1d53c9297acc7fd98f21e70268032eabe15c6593b142e1  ext/tasks/pola-rs__polars__29923/issue.json
b25f94fc3dffa6f123a34c86435b5c23af8142396f357f0b6c71443366c7b21c  ext/tasks/pola-rs__polars__29923/meta.json
fea50252b911a27f907bebfdb81c9ed7897d33621247bb3ab5f57e03abbf141a  ext/tasks/pola-rs__polars__30060/issue.json
281dc7e91629675f419c1f572d3101a8de1f83c9624d463f2086b06aeb4ed4a0  ext/tasks/pola-rs__polars__30060/meta.json
e7c4acca2e295013c0ac4aa8866bb72195faea1dbc82a0a1624f80b43b4487e7  ext/tasks/runmaestro__maestro__1783/issue.json
b738abd92149d898a26f0248aaf9ee9ab32e2949c22ddae25b71159e5382a3b9  ext/tasks/runmaestro__maestro__1783/meta.json
22f9dd2321f036bc74fce98d3595d42c8f19c9ff2926da6ea42b00f3d0ac2d6f  ext/tasks/rust-lang__cargo__17562/issue.json
4e4a0f6f122fe01988dec079ec917f16c2ce6d2ebd81b7cc63a59a830862b1a0  ext/tasks/rust-lang__cargo__17562/meta.json
ae1707304c4dfe548e00977535ce9a3788fc3da2fb4b009e6ef700a978b9dce4  ext/tasks/servo__servo__47685/issue.json
d3ac117a7e161ab03f06e6830eac97819cffe8f1baccb2e17a0d9d48c4c07d4d  ext/tasks/servo__servo__47685/meta.json
4224dfe2b019de83780b5cf451517fde113f5bc6aa5aa097db87d58296c0b42b  ext/tasks/super-productivity__super-productivity__10055/meta.json
a3ba2327b3bad14647f08a3ea1b52d4563faee3ec791500850db779443683dd3  ext/tasks/super-productivity__super-productivity__11066/meta.json
3cc0e124df01447c31e8460e4b398cc97dbbf21237ea5e720e9ffdcbd611c10d  ext/tasks/super-productivity__super-productivity__11313/issue.json
758a6f6388a632e72baf97d0c368c31668bbdf855bff9091a17ec1ac91e8a31d  ext/tasks/super-productivity__super-productivity__11313/meta.json
8f93a2f35327e8b28797240e194b6c60b2f75b3f17d30757c1998e1fbaa0a11c  ext/tasks/swc-project__swc__12010/issue.json
9ee7576cc2e7364bd76bc06fd53db687390d88e894c12c9596e8d943fc312396  ext/tasks/swc-project__swc__12010/meta.json
42799f4f537177c763b53ce3fd2493ad8083ce16303862a4ca956b2d96a6afda  ext/tasks/the-open-engine__zeroshot__944/issue.json
9fcdd600013c31efbdf7f54956b4263f9a5dcfb098d86513c06bec1b1db851c4  ext/tasks/the-open-engine__zeroshot__944/meta.json
935d5132397402fe171b684fc7e2661b4503335978a5aa7de924d53ff2f858e9  ext/tasks/tokio-rs__toasty__1238/issue.json
3a9c2ccc8bba6a3b0f3bae1ef4289bc8d3c999680d2684ac4a2ab03de9028549  ext/tasks/tokio-rs__toasty__1238/meta.json
17e891c0d5fcb425d9d1158e70b669c6c64d9430613251a5c70350b47e148d43  ext/tasks/uutils__coreutils__14754/meta.json
19170faf70cfbd45d23a691ebb3809211aa83c71f134977b03f913e0e8f97f04  ext/tasks/voidzero-dev__vite-plus__2667/issue.json
322fec6ccdc67c3af650edefe2016271df939cbe7e760d6724013a6087f84387  ext/tasks/voidzero-dev__vite-plus__2667/meta.json
fe79ff6b966c4085557e9db8ac6867900325d2db246ccf0b8a85b797acc98688  ext/tasks/zulip__zulip__39943/meta.json
1e1af830f616c35294a3863f8af0996ecedbd40578ca5fd2837da0f15101c7f2  ext/sealed/apache__datafusion__24211/logs/base-1.log
222477b398fc7aa07bafef27a1d5ab3b8863c6e3ffd97c2fc9d9c3f0c6c35e9f  ext/sealed/apache__datafusion__24211/logs/base-2.log
467f51bcc3f5764aa1540c23f1ddc020007a47983820481946a1f9965507e990  ext/sealed/apache__datafusion__24211/logs/base-3.log
d99efe3f007eee37ff895aeb6aada3149a6a1f28d77f624784a8fe1237784997  ext/sealed/apache__datafusion__24211/logs/end.build.log
c8f97c671f3e063a9ea914c8cb3ade4790cacff29a35d2bd56ccff76f0f8497b  ext/sealed/apache__datafusion__24211/logs/end.build.log.iid
349c3a1c4163cad07eac9b394f3ef595cd671cb2c2bc7c4ea9112f75cc024845  ext/sealed/apache__datafusion__24211/pr.json
1f41384afdf8d77460ad93cdfd904acba050458bf93fb4db23f460a3586dc3e0  ext/sealed/apache__datafusion__24354/pr.json
c79760dfbd04d15a5f3f0a4e34f06bf29c6eab920db687fb823bc3793348568e  ext/sealed/apache__iggy__4018/diag-end.reply.md
3a5d052d03996b00575142ea79ad1d8ff07485a2a43f65b7f22b16babbb44eec  ext/sealed/apache__iggy__4018/diag-end.reply.md.run.json
eea41412bd06c27630ce4974f677600980f1d1bb4e9e9315e2916be04fca4db8  ext/sealed/apache__iggy__4018/f2p.json
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/base-2.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/base-2.xml
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/end-2-1.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/end-2-1.xml
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/end-2-2.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/end-2-2.xml
17914fc4a3fe017b35c861e620187fdd7b03cc4455720d453ceb04e5a5c2309d  ext/sealed/apache__iggy__4018/logs/end.build.log
52f61ef8037713ba36722ba081b22ce220f8ad67116e1f09c70ba1591335a680  ext/sealed/apache__iggy__4018/logs/end.build.log.iid
94410629314c3d66c7b4fc03de860b169536fdeac9a024a5dbc13b8cd647d6f5  ext/sealed/apache__iggy__4018/pr.json
eea41412bd06c27630ce4974f677600980f1d1bb4e9e9315e2916be04fca4db8  ext/sealed/chakra-ui__panda__3925/f2p.json
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/base-1.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/base-1.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/base-2.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/base-2.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-1-1.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-1-1.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-1-2.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-1-2.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-2-1.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-2-1.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-2-2.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-2-2.xml
127c1b68910e63d26ce7cb8cdaff6b6ba6e1b54afd35fae0db0b845c22172444  ext/sealed/chakra-ui__panda__3925/logs/end.build.log
4ba89be739d2424372369bf9f0822cd1f29bfaa47c8a757645ede284fd9cd1a4  ext/sealed/chakra-ui__panda__3925/logs/end.build.log.iid
e6e7bae09ebe27de1bb34e531e29e5cfab32efce49a69236a845aa1ddc847acd  ext/sealed/chakra-ui__panda__3925/pr.json
3e3a84e2ce9a50e1683246ce82d63cb8dacce1b852bbead280bbe4269430e711  ext/sealed/cherryhq__cherry-studio__18688/f2p.json
fbc029de00658f8f0ed8a3794513e8d28f2fc03aa0bb443823bda354d7961214  ext/sealed/cherryhq__cherry-studio__18688/logs/base-1.log
66098648fbe52f826a192b4352b356f383d48a75476e46ef952148540bfff20d  ext/sealed/cherryhq__cherry-studio__18688/logs/base-1.xml
977c3ead65e1cd820e0fe3ec2e66c978c7805acefeb1411459910eba2a95d514  ext/sealed/cherryhq__cherry-studio__18688/logs/end-1-1.log
c4db9239033481c54e075b2a3ef582e2e53544d41df3ea46cf607082ca284cc3  ext/sealed/cherryhq__cherry-studio__18688/logs/end-1-1.xml
69a214f347157ff0132a8c73bc615a52ab898dcbe1f12a9df0351d1ae76e2de1  ext/sealed/cherryhq__cherry-studio__18688/logs/end-1-2.log
8beccaaab65aeafa316ba59996fcad0a5c7a240ff5e9a2122ac8d3688f663a51  ext/sealed/cherryhq__cherry-studio__18688/logs/end-1-2.xml
d3b54f56ee46abf2186054fe0db0d0ab3bf43ef612ffd8c636273d31adbab92a  ext/sealed/cherryhq__cherry-studio__18688/logs/end.build.log
f717e59193a5de63af417aab54a720f339ba18f98f8864e489b1ecba59ffe207  ext/sealed/cherryhq__cherry-studio__18688/logs/end.build.log.iid
b50df30980c68fedb88763c36e628476e81502757968ea54e29f3839b3c1111b  ext/sealed/cherryhq__cherry-studio__18688/pr.json
6aabb887d32f990fe88faf143493823a3e8a201ed51af00c4b99c77605983c5c  ext/sealed/cherryhq__cherry-studio__19874/f2p.json
b193a60458a0d2fe94e10a431733ee6bbe729b9d6e4d2a88d2266831555a5b08  ext/sealed/cherryhq__cherry-studio__19874/logs/base-1.log
f2690c534d2d52db8e93173d6fdf2703a3db7eb0dde4e00219d3af559bc90952  ext/sealed/cherryhq__cherry-studio__19874/logs/base-1.xml
6cbbdf97a260fdda6335238d3f34ae5e454e4d9df43f86d84d6a27c779726311  ext/sealed/cherryhq__cherry-studio__19874/logs/end-1-1.log
b2010e4de585d137c8b7812b40b0dcd4a333ceb3ca583039cef7a18c458b4c20  ext/sealed/cherryhq__cherry-studio__19874/logs/end-1-1.xml
2b1bef2117d26e232f8cd0e71b0a6f71dbd79d3d093492b4b764a94fc87a4e8a  ext/sealed/cherryhq__cherry-studio__19874/logs/end-1-2.log
4d821f61b69c6952376e891184c9808f68cdc3f1b20d5ee7f6e1bf426c10a416  ext/sealed/cherryhq__cherry-studio__19874/logs/end-1-2.xml
00ccdd2b32a2af5f214d7aec13485d167438d733ff4001a79b58af72fc45a12d  ext/sealed/cherryhq__cherry-studio__19874/logs/end.build.log
4a171ddf8dbcd2492690438a9b7a5a66b23ca6a9b0bc0541801336e63db0c452  ext/sealed/cherryhq__cherry-studio__19874/logs/end.build.log.iid
b8910950520ab642ac56237ace3c3e8c1cff20a532c69486293a865c3d0b5f52  ext/sealed/cherryhq__cherry-studio__19874/pr.json
933d7c57bb776238cd0d65088302e4cf7d03e1490f79770c23b2247b6ac92e8a  ext/sealed/coder__xum__5191/f2p.json
670f9b57fe5c0f0ac67a8baa8a4d7efc3f9f6b4922c2a4d5b2019a50eb0ae0d6  ext/sealed/coder__xum__5191/logs/base-1.log
e2befdc2fa85153a0dd575609862a315e1e0d261848b71120ec5840328b2354c  ext/sealed/coder__xum__5191/logs/base-1.xml
b167f774a5035ee87c14fca9bd44dca431aea1bc47ea7f8e15da4ad26c3b87e9  ext/sealed/coder__xum__5191/logs/end-1-1.log
72a5fc7c89f3d550c4cf6e92f97c34c5ea8a88a30e5b903ff7f1524d3f887b91  ext/sealed/coder__xum__5191/logs/end-1-1.xml
1d3490f4f5537b8ed0f95f0fd6bc04a962192b099384b0e3f6b551c80bef5429  ext/sealed/coder__xum__5191/logs/end-1-2.log
f05ef23caab474913d9a1e457ad4517622add02883708e9d373b40dd6723dc5d  ext/sealed/coder__xum__5191/logs/end-1-2.xml
27cb2a25eb5b3fd7b7533d938a131cf5b09f83494c5301ea6a3f5ed234c5e1b9  ext/sealed/coder__xum__5191/logs/end.build.log
3f1fff82afa009caaeb7ce0bf3eeff76b520ebebe6980892cfd4e213851fc394  ext/sealed/coder__xum__5191/logs/end.build.log.iid
711997d02a6b8c59160b1554b1620a05f9ba8927acfedb33dc8918f852ad8ce4  ext/sealed/coder__xum__5191/pr.json
dc4f52fc775f6c2d3718fa2cac7fda28f60085e6cfd10834180bf79b2fdc952f  ext/sealed/coder__xum__7059/f2p.json
2626d343d40aeec5d71fdab3b7aa2a3875660d57ada08edcd1dcba90546578eb  ext/sealed/coder__xum__7059/logs/base-1.log
a10a0155bfcd2417ee7c63c9667dd30f58e30a69578de5b0929f1b0c41a68476  ext/sealed/coder__xum__7059/logs/base-1.xml
cbefbfe88b16b29eb32cc57eb8478cea6f4358edeb0b39fcf84aeb9f560bb664  ext/sealed/coder__xum__7059/logs/end-1-1.log
04eb3f51ee9fb187c62cc7d378facbfaf343826757d6aad24233ffed71d5c0ab  ext/sealed/coder__xum__7059/logs/end-1-1.xml
107639f8b0c48fa1bd92410e7faea42a61879b52761e2c23799ddc7ee3ba8f7f  ext/sealed/coder__xum__7059/logs/end-1-2.log
77d9262afe4b108a881cfacdec2de2f011ee82b62b735ce7e71a2bceb08b0577  ext/sealed/coder__xum__7059/logs/end-1-2.xml
872aab5ef0065455e881931350462c403bf7684b3b6e139ac1894c7ca3121801  ext/sealed/coder__xum__7059/logs/end.build.log
3f1334a2db6f0e40b7d2230800d3fd5844517bdceba2993a69282bddd440876b  ext/sealed/coder__xum__7059/logs/end.build.log.iid
dee2fa7dac60a490ade8c2c6d97ed73589fd8394442c330b7ea14c4a7106a973  ext/sealed/coder__xum__7059/pr.json
2344560ab1e8aeae58d5e38762afefadff17c95404ecc7b040b6af72f6b28904  ext/sealed/django-commons__django-debug-toolbar__2502/f2p.json
0ad11c62e1c1bdbeb9a463742043691eb85246d6b87fa80c44fc797087ffd070  ext/sealed/django-commons__django-debug-toolbar__2502/logs/base-1.log
63b25be16b90cfebc0e10829690e4bebc03301c643e7a17f2bd510e8ee009b24  ext/sealed/django-commons__django-debug-toolbar__2502/logs/base-1.xml
a9cb8ac6a0457189d85c646e11fd67db8dedaf65b88f7617ba21893db02b14b1  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end-1-1.log
c9c2525728aa8a35b3e0dee932d1d696b96d909a7cdd91c1367dcc39107b8447  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end-1-1.xml
a9cb8ac6a0457189d85c646e11fd67db8dedaf65b88f7617ba21893db02b14b1  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end-1-2.log
12344cc7dd5e587ff5791e78841b1933bb90a2fc5c9c0dafd425b57981a84366  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end-1-2.xml
72ea8f70ec9d0329f2b04aadc798ecf5739983fab6ec273632a624cbebc75231  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end.build.log
d9a5d9d7d339d60b334d001068915e23193d8dc2c1079d54a0ac58e794851c51  ext/sealed/django-commons__django-debug-toolbar__2502/logs/end.build.log.iid
c375fcb769cee5bff49cf897c853181477b53ad196a4ca30c84c9df6f805d2c6  ext/sealed/django-commons__django-debug-toolbar__2502/pr.json
eea41412bd06c27630ce4974f677600980f1d1bb4e9e9315e2916be04fca4db8  ext/sealed/fossasia__eventyay__4509/f2p.json
ad02e6042653ba7dc5c672e825c99645e1b0cb10a40b3b95bdb8056ba3b3fccf  ext/sealed/fossasia__eventyay__4509/logs/base-1.log
7539c1a04e1665dd26a6315aa825f2e7ee624ba66a541894e9f816671da68fae  ext/sealed/fossasia__eventyay__4509/logs/base-1.xml
8e5447ff4f703170c52da0f5395450da129f17f80c3b1283619ce8ad53248b20  ext/sealed/fossasia__eventyay__4509/logs/end-1-1.log
7f90813374235ba133d3b0369ead9c8546df9190e7277dc4c78bb97cff392f02  ext/sealed/fossasia__eventyay__4509/logs/end-1-1.xml
fb1bb19e8956cd3ba68a8e23600b3290fc3ce979b4ad56318c2a40cbb555d952  ext/sealed/fossasia__eventyay__4509/logs/end-1-2.log
821686a0088308d329c713b52afb14d6292f0b052b9b188540a80a81bd7c480e  ext/sealed/fossasia__eventyay__4509/logs/end-1-2.xml
80dce383ece0a0dab8ba4333c4b45e22c0bc6291d82e66276285bd60d7f13d75  ext/sealed/fossasia__eventyay__4509/logs/end.build.log
cc28a1789c7280aee18e4b2f00534997d2236e7d16292b0fd85a9e8e19edeb26  ext/sealed/fossasia__eventyay__4509/logs/end.build.log.iid
4b64aed8e2ab5bb29170d72aa90b8029aeacc54f426c1fa93f5176fe8631817a  ext/sealed/fossasia__eventyay__4509/pr.json
22214e77d9a0da7f9e7dead89251f3512b4c3392b97b52c1aa2ab359b8afee99  ext/sealed/fossasia__eventyay__4689/f2p.json
55a718f885b698b52eb7d3f1fb2234cfcff9df7e703e99cf817e1b862ab53880  ext/sealed/fossasia__eventyay__4689/logs/base-1.log
b3050b091d36fecf74a160cd303840639ec2e64c41ce95ba51f7e18502514302  ext/sealed/fossasia__eventyay__4689/logs/base-1.xml
e459e41ba314b71c204403d6d84d682b6a65bc92dac275031fa0e2443add98de  ext/sealed/fossasia__eventyay__4689/logs/end-1-1.log
1aa28bba5c4ea6111c6729409a0e09b18f00de23dcb94a5b82f805f8edba5368  ext/sealed/fossasia__eventyay__4689/logs/end-1-1.xml
91ba4cd8976db7e2a4a39f02c4955fa3c724ef68dad17f0e031460eb4b41f679  ext/sealed/fossasia__eventyay__4689/logs/end-1-2.log
c2839a3cb6b92bfe584c7d56bd015e69a6a0f0d8672466ea8ad7357e631e868f  ext/sealed/fossasia__eventyay__4689/logs/end-1-2.xml
2c36dab633cabc1ee9c26af71fe3cb710c0f84588c50ef142ecd1986060c9bc2  ext/sealed/fossasia__eventyay__4689/logs/end.build.log
e0f9712c2839e4a31e558902e8432a2da2b6419e6ab5e8a57f558da42eb20708  ext/sealed/fossasia__eventyay__4689/logs/end.build.log.iid
027f0dec700f390accbc7c6f01dfd869f3a530027fedab99a9be64816d808347  ext/sealed/fossasia__eventyay__4689/pr.json
2cd988e72e9d41a13acd987cdc747f4c9ab85caeaf87095163ff418f761274c4  ext/sealed/ismaelmartinez__teams-for-linux__2778/f2p.json
21c8c8eb6df9b7c6f60d02999fe0e8ed4e85bb2aaa6991db2a6b1ac59bad3ff0  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/base-1.log
ad24fcdf5f10ca090ae1cdb0befe53a2dd3a8849cb88d766a3e8d276a86c2180  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/base-1.xml
b0b42b74d69143e28de082c807f36fd3cc50232659fd805c0c30c3558881a90f  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end-1-1.log
8e0331c6b8e435ae69fada033c5caa4aeb0b531f5d295c6f9250addc44fd8757  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end-1-1.xml
22b1b63f0a1be8e1fbf02a4ac4fdb2b6f729f3941fc92c6a5a96fd189d8a6f35  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end-1-2.log
46c40a64c2235b58c82bdb324f9d41e51ca7213cd956cf961d17ab3377f0fdaf  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end-1-2.xml
06f7447dc9d009c1b1a1ada0563c2d5a640da24f103d90bbd489809e012e1e05  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end.build.log
53d9b39c8079310c2795b048e91420a1bd8ab46c6f19e5acb2a0ea1870ed0dd2  ext/sealed/ismaelmartinez__teams-for-linux__2778/logs/end.build.log.iid
ea745140e18be4cc4cf80d242837c404ef19e1359bfcd299c139e0499148b743  ext/sealed/ismaelmartinez__teams-for-linux__2778/pr.json
ee81e4d53438982b0116b3708b5f1ca10ebad129f546421afdd9a8571abfd766  ext/sealed/lancedb__lancedb__4486/f2p.json
f70beab08f5484a895f30cc31227cad5029e4c78058f4aed13917185ba96e068  ext/sealed/lancedb__lancedb__4486/logs/base-1.log
5cf91e36ee6c13bb654a67298bc25346fc5b301b605f86ba5a74947847b6cbe1  ext/sealed/lancedb__lancedb__4486/logs/base-1.xml
0a0fdd7ea0ab7b17fbfe9c8c6dff4114be7b5c690a264610f2b49c0f30fb1248  ext/sealed/lancedb__lancedb__4486/logs/end-1-1.log
fc26e693271be7ede2b6c1e4542fe623004e97153385ab2ac2441f3c4e1d9719  ext/sealed/lancedb__lancedb__4486/logs/end-1-1.xml
b3934f00a9f3df6e7fbb28b068e4e90352dec3fb3900a4709faf86262a9f7103  ext/sealed/lancedb__lancedb__4486/logs/end-1-2.log
fd7c6d61af3104c354836689bd4b52fa47fdaf121c2786a901e489b1288ab73d  ext/sealed/lancedb__lancedb__4486/logs/end-1-2.xml
6d6cf2ad8aaee40476ed6ea148198f285075eb95b206c036f4883394a10d9134  ext/sealed/lancedb__lancedb__4486/logs/end.build.log
efaf1026e23f386a3f2bfd1db9b04744559e2c79d3ef254d759f91fbc4578897  ext/sealed/lancedb__lancedb__4486/logs/end.build.log.iid
e748162d601c8216a4dbeefc9d451d15a4cf5953ca2471cac0537f8b99c6e4b6  ext/sealed/lancedb__lancedb__4486/pr.json
f002f67e98f8f667231394010feb626ef517b6f9075b3c2678a128ede95c3394  ext/sealed/mxsm__rocketmq-rust__9140/pr.json
94768e0a278800c71ea43fd6edd6e8dd4be63e1aa1922c63f5b6358e0d6c6335  ext/sealed/nautechsystems__nautilus_trader__4813/diag-end.reply.md
260dd04f82ea9484296d20407d9b48ed32dfbe3b7f326499ac5b19507e0c1edb  ext/sealed/nautechsystems__nautilus_trader__4813/diag-end.reply.md.run.json
f8efbd5d278030314bf3d80a4693ce3682cb4409c80b43f27f604f9a5ecfc29a  ext/sealed/nautechsystems__nautilus_trader__4813/f2p.json
4fb8aae796498ce57e6329691a7a2968a541bc5a2fe9ce1e04a855dc9e59d544  ext/sealed/nautechsystems__nautilus_trader__4813/logs/base-2.log
ce7dc0ecd27144149f88e823192f02ddb993bc84b61269da19be2683c17ec084  ext/sealed/nautechsystems__nautilus_trader__4813/logs/base-2.xml
efc379c19dfa07f274e388f2ba0052721322a8e0559e930d00ececbb4760c2c7  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end-2-1.log
5ad6e374f0f19cd351a20cc1f27e9948b081f6e63109609b76bb291c82139525  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end-2-1.xml
b9dab5a2c7234aafa782976864a6275228d68a729c94ac7cd5534e920de7644c  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end-2-2.log
336bb5664182b299af63b7379c47e1085a7efcb84655f65836a29dbc0a951c98  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end-2-2.xml
7ce132f7162e54db5c5790f466cff48fcad7d6ed751db0f4057ea9892ee6090a  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end.build.log
9ede17cf79bf9be3e4d8d37d823c3bb6ba7e0dcd9f1f1ca2c6f72bd9d86d195a  ext/sealed/nautechsystems__nautilus_trader__4813/logs/end.build.log.iid
01dfa1fedabcba9c247db5e3cbf89ca15b885a677472554eb97301777746528b  ext/sealed/nautechsystems__nautilus_trader__4813/pr.json
b14956ca07a51ca8135430afc69ee2835ac372e1cdbb8e75c168e74089ea6d0a  ext/sealed/netbox-community__netbox__23175/f2p.json
84e9126ab5245bcd967ab045f0011041789a42ee158677bbdbfb3aaace5d84cd  ext/sealed/netbox-community__netbox__23175/logs/base-1.log
bb8e7242fa195ace9f7df91323107c06454be8637a8b2998631aa9f8e1ab5ab4  ext/sealed/netbox-community__netbox__23175/logs/base-1.xml
ac37e9141859605fb332a1048d314f8dc41b0ee3f2856bb66a3d7881b950b53c  ext/sealed/netbox-community__netbox__23175/logs/end-1-1.log
fef201a7df5813bef83d39f7bac2687af8be6a0ac574461ea904e7d04b382076  ext/sealed/netbox-community__netbox__23175/logs/end-1-1.xml
a52ee527bd8de6a0e33f2139d1904b0fe4ea38080391ffd99f2a7c712578ea4d  ext/sealed/netbox-community__netbox__23175/logs/end-1-2.log
5ae52fc294450706d33eb260a99db52500abccba1e92166ce101f571a28f3bc1  ext/sealed/netbox-community__netbox__23175/logs/end-1-2.xml
2e4e554cc501b8c08ac706e86c9135b2206a7139deeffcf8380b6874d6b0ad2b  ext/sealed/netbox-community__netbox__23175/logs/end.build.log
d20e5e83a04242ab2c49a372475010721fba23913dd3c6cad9cb355d2632144d  ext/sealed/netbox-community__netbox__23175/logs/end.build.log.iid
ae65fc9830da25fd28fff87365260760c757fae77181d6798d4e4987a4e9ba4b  ext/sealed/netbox-community__netbox__23175/pr.json
91c37db25fbea61b6fa7e168f45b17752807b42fa6b64d2b1399d3b2fe3f8360  ext/sealed/netbox-community__netbox__23277/f2p.json
7ecf7a8beb4a3cccc318a01e4e5751db9b8805e5c83fa368e51948eeaac4d341  ext/sealed/netbox-community__netbox__23277/logs/base-1.log
da90b50c943932ffca9d0a7846897824739b651f0f34e00649fdfe6ab8ed1f46  ext/sealed/netbox-community__netbox__23277/logs/base-1.xml
b836a7aa10d550dcb4edb2e5d94db835dfc79f30ffa181b9c04abab8a60d4d40  ext/sealed/netbox-community__netbox__23277/logs/end-1-1.log
57545ef8df616ce64a8b0458d6ef2159e1dc70ec6c079ce62c9cdd265a6cfffc  ext/sealed/netbox-community__netbox__23277/logs/end-1-1.xml
73097b1ce04c9b6fc7833d14b832406abd2bcd5206f9c6a6526ae77360114a41  ext/sealed/netbox-community__netbox__23277/logs/end-1-2.log
73fd2a813785fdd8a2c1541d1dc6b132de23b746da2eb47b24401149a10864e3  ext/sealed/netbox-community__netbox__23277/logs/end-1-2.xml
a572ca2b38954cc2bfa370a42e50d8a1b4e538a39d45de5b1e9f0e1761d5aa43  ext/sealed/netbox-community__netbox__23277/logs/end.build.log
6ef1d7706898704b55c99f6e5f076f5e06846bb5759941774c39d3c40aa9eeb9  ext/sealed/netbox-community__netbox__23277/logs/end.build.log.iid
6898b2728a2c09f5058db6259f18091b3a91ea09f0e61a9d828511d77d041e31  ext/sealed/netbox-community__netbox__23277/pr.json
ea9769ed15b910c0e6102e72232f9dd8360e3c56290c39a21688178937fa8282  ext/sealed/open-source-legal__opencontracts__2124/f2p.json
a8bc79372b88a50cfe35032256b32c3fde998055dcc32670deb4730cd5ac5a5d  ext/sealed/open-source-legal__opencontracts__2124/logs/base-1.log
34e063f560c3ae52d75d17393c8b6f7558a92a6f5cb1dc61923201e60e64e94c  ext/sealed/open-source-legal__opencontracts__2124/logs/base-1.xml
77089219c5172d74397897a91e5f7fe398688c23007018942911d4b1610c9990  ext/sealed/open-source-legal__opencontracts__2124/logs/end-1-1.log
3e413238900c791275ec917a67feffe602bd37feb30d68717361219fa7fb0e46  ext/sealed/open-source-legal__opencontracts__2124/logs/end-1-1.xml
175aa2c2161907da77b8c23da9ffa9974a217a7b523a819a1ae67b10d96f1d71  ext/sealed/open-source-legal__opencontracts__2124/logs/end-1-2.log
ac7fffcb21f7c0418965ea24de42a5217d63bcb2cb9c1e7e783269b1c2dee84c  ext/sealed/open-source-legal__opencontracts__2124/logs/end-1-2.xml
90e8342fb2430efa46c4d0914ab23b0d58aac48f5c0018ceda0d5282e51e57f1  ext/sealed/open-source-legal__opencontracts__2124/logs/end.build.log
da8768bbbacff2046d8f79fb75e0e3ec2674ed68eec82da92b4377871acd1fd2  ext/sealed/open-source-legal__opencontracts__2124/logs/end.build.log.iid
659d3a2b91b7d2eb72a518f1bf609cc2f9fbbc962afd3c449422c9486945de77  ext/sealed/open-source-legal__opencontracts__2124/pr.json
17ebde6e9e1608d2b6725106493bdeabba08117460f6c5a2dd841950a720e06c  ext/sealed/open-source-legal__opencontracts__2371/f2p.json
59118b33956738ec0b2245c0a87f0f4f7b893bed55ff465b2d8ba8b4a4502bfb  ext/sealed/open-source-legal__opencontracts__2371/logs/base-1.log
d74fefe41235d43d46a031bf0170e3aea73d893037eb0a07d6ea7c3c6ce0495f  ext/sealed/open-source-legal__opencontracts__2371/logs/base-1.xml
554f9309bbf45e3277c1f82a1d5fc5c4396fb65aefc5ee484c899673e26a3be7  ext/sealed/open-source-legal__opencontracts__2371/logs/end-1-1.log
0d1a2f1c29cc4057e27ffba7d94fd919ed75a0d5bf61c82c6c4e0f1164636053  ext/sealed/open-source-legal__opencontracts__2371/logs/end-1-1.xml
15685fff27ad04bbf1c23b2b8c811f1deac82261f347117ff9f38f4d8affac03  ext/sealed/open-source-legal__opencontracts__2371/logs/end-1-2.log
23458055e915e0bcaa6aeb8a532387f0d5b21c1100f6db17fcf3e0370755b8bd  ext/sealed/open-source-legal__opencontracts__2371/logs/end-1-2.xml
56f3dedf52102429a592780d71de731e4fad1e3f0f6f62ceecab02d8556c0eda  ext/sealed/open-source-legal__opencontracts__2371/logs/end.build.log
ffc6dd81cb495260b6dedc814e5695c14c61a889a4352601c940da7e4dcb985b  ext/sealed/open-source-legal__opencontracts__2371/logs/end.build.log.iid
aa8c152828361de27af9c0b7dde2f9d77c63c6140b4b0cffea21aec1749f927a  ext/sealed/open-source-legal__opencontracts__2371/pr.json
d63405112a8317840bf62a762367b1a33a4d64a92f43d1bfe9ee1c0ca10b971d  ext/sealed/openfoodfoundation__openfoodnetwork__14719/f2p.json
91dc9d2b4527060507c032a4db2e71cf7abd2fdd7421cb4952a3db1d8677b414  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/base-1.log
3f693afb3f7184f535396e2d68de66ddd73efd9d215d7f4c874f03f6de881e8c  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/base-1.xml
bb5f79ccc1cc7ebe252e70ad5ee17fa3221b7b71bd9c836bcf5bf0e97a0b056d  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end-1-1.log
7313f8687a851994cdddab5965ba5a4784caa25ce92d9daad67f4e19d0d20d2d  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end-1-1.xml
c0c377104ef2e8b4b5d660fcd289f5c7438bd83235a2fa480ed09587b63f109f  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end-1-2.log
b450b31613c05bfe66615f8d93bd940d62bd6e3e38b922ae004fe5d4b4f7906a  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end-1-2.xml
6514c28b782154664cb63b45950c3deaa0db389b6239f2788650ee45c53cf299  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end.build.log
379550dc83a5aaba73b43fe9ff85fa198ecf2c61333e489102170fd817848d1c  ext/sealed/openfoodfoundation__openfoodnetwork__14719/logs/end.build.log.iid
825e8495e6acf6f8f5ad01581363f2e222eb3ee89d00b318e7f63c8bd2226436  ext/sealed/openfoodfoundation__openfoodnetwork__14719/pr.json
5b0e8dcbeeeb72b9917028c87a1415e9b6fee0efeb6d9d851b0517f7dcbd3a2b  ext/sealed/openwhispr__openwhispr__2643/f2p.json
a7533c27f3c0861fc997ec7af8e0b6769b1532964b697d5dd6ba8b284873e0cb  ext/sealed/openwhispr__openwhispr__2643/logs/base-1.log
44ada1c7ed56022727b8dcb9d41ddd9ec357215382997ba88b2dfc2e4e0b93fb  ext/sealed/openwhispr__openwhispr__2643/logs/base-1.xml
8d95cb77d0f64b865b6b2e2b81a41d170fb9745373f0e4980170f68b9c3f3590  ext/sealed/openwhispr__openwhispr__2643/logs/end-1-1.log
892dc1775775d1bfbda2d2a38931a058fdb17df602dc36d5b76447b0938a9935  ext/sealed/openwhispr__openwhispr__2643/logs/end-1-1.xml
4aa92866c66a2c3787c3a61f26a2f0908ead5367f131a345b90d53c8e272726e  ext/sealed/openwhispr__openwhispr__2643/logs/end-1-2.log
823eb560749764ce4f63edf78fc3009cdee450304159cf9948982b60d0065fa6  ext/sealed/openwhispr__openwhispr__2643/logs/end-1-2.xml
af0cda102ffd235f5977cec383d2bbc82445c5691c1b8413c1a8e4835485e927  ext/sealed/openwhispr__openwhispr__2643/logs/end.build.log
e4cb9b14d6175d5ba522f1b314d128153baa1500d451091806aee8441495b8e2  ext/sealed/openwhispr__openwhispr__2643/logs/end.build.log.iid
dafc856957f30a406fa34d2af265feda30106f2b0f61c1aa17cf1c8cfd894e3d  ext/sealed/openwhispr__openwhispr__2643/pr.json
86b00277c34f6186de02afccff4532ff1f5c8524d5854259e19fc583854b43b2  ext/sealed/paperless-ngx__paperless-ngx__13486/f2p.json
9988489fd37dcb054087ebe1dbb12d05bd29a87b31c0b38b635314da78313bda  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/base-1.log
42c047a249b656cc77c7389c3197942e1f145070042a2066872141f4023c14cb  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/base-1.xml
bbc9e64bbb9a0749f9a96c8b9fab34f3f025a1e1a421873cc8f22609001cc6cf  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end-1-1.log
bba8f7692f413d87ed50d4ac6608402d9745858d23d712a3cf1d3fd604a1a152  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end-1-1.xml
debae6a4c3ef695e54c4cb7998ed33c63e105310c63bb0210b178af95675ed31  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end-1-2.log
763560832b8b2ad3080a1c9d39493b8181403a240133b2e5dc9366766fc5886e  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end-1-2.xml
f540f83dd49f67c8c856cc9dc4a2bde51d2a0e4b214912d0f6850ed716f2bd51  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end.build.log
7c3c06f14997a51e4a5465767f7c59250abeaccf7fd1053bc2bb48edc92e331a  ext/sealed/paperless-ngx__paperless-ngx__13486/logs/end.build.log.iid
a08d7f8fa2a46452217b41bac934116485f1f6591fad63da391625a19836d705  ext/sealed/paperless-ngx__paperless-ngx__13486/pr.json
e7077864e89bf73045c8ecfa18b9f73342df69e17a9962bdf4f2b5e0308db1cd  ext/sealed/pola-rs__polars__29923/f2p.json
f12f93348fb5c5f17b88a8ba327fe9cded52591aa11828d9997cbdd1e38f7c36  ext/sealed/pola-rs__polars__29923/logs/base-1.log
dc68e01dbce422188c6893d220b94cb081619276857f83975839f50e0d6dae5d  ext/sealed/pola-rs__polars__29923/logs/base-1.xml
9bdb8464571fb7c6b59e6d9ee0a195bbe54c0a3eac836f9a4c1be928c63e989a  ext/sealed/pola-rs__polars__29923/logs/end-1-1.log
b2dd4dea61888b3f4de0f82993b327e34e0bc8a17876d0db3ef9fb7472621130  ext/sealed/pola-rs__polars__29923/logs/end-1-1.xml
8da92522dee05fba4c7dffa560300040e23a7f848bf9f6847ec73a627b04b5c7  ext/sealed/pola-rs__polars__29923/logs/end-1-2.log
5179a89dc6894a02440bf0354f9a340295fbdda851c72a395d5c53f80d89f5c8  ext/sealed/pola-rs__polars__29923/logs/end-1-2.xml
bafff13b13f093ba3fcd2dec97997894d61da4f411346337084e8561c8477168  ext/sealed/pola-rs__polars__29923/logs/end.build.log
b252371134076b88fd69a2b0888b4b20a9e716b2843b71da5716c3c83a382e6b  ext/sealed/pola-rs__polars__29923/logs/end.build.log.iid
50fb1ec611df56701011a361ccb565cea3b4bc71744123b022c66bddfd8eb2f5  ext/sealed/pola-rs__polars__29923/pr.json
02453377bc59be3d1b0acbdd9228e77fd39d4b8894fd4f11e2e6ab149bb0d001  ext/sealed/pola-rs__polars__30060/diag-end.reply.md
27296deb9f15ef3894c70921e8003a8caef43862a5438903e56e1bd634be8b88  ext/sealed/pola-rs__polars__30060/diag-end.reply.md.run.json
f568f738c076ee6f2c73530d937a6cb716487ee2cefd3a9453e182aed53c0406  ext/sealed/pola-rs__polars__30060/f2p.json
8ea328e60a155e0fdf4d0d8704e073d07f04b7ed27d316bb356d30e2eb1b5d6b  ext/sealed/pola-rs__polars__30060/logs/base-2.log
fc3ea38ed9bdd6c4087244e9ffc2ad9d236c147a5c2b6ae9e6fc28f5860820df  ext/sealed/pola-rs__polars__30060/logs/base-2.xml
305b39fa7a221b34639016eac97e6ca6bfc42cc39af9d1d60449d5362fda71cc  ext/sealed/pola-rs__polars__30060/logs/end-2-1.log
8df152efb7d5b6b72d5ca1f96acab68250160027297224f388a749a24c1712e5  ext/sealed/pola-rs__polars__30060/logs/end-2-1.xml
a220fd5f8284de317bfe4169be0abae6d3160b835bac5dca829b1106cc25b22e  ext/sealed/pola-rs__polars__30060/logs/end-2-2.log
49084502154c1b31ad76bbbaadab8631fe6e4dc104e2d7d72a2cb3c5d120f597  ext/sealed/pola-rs__polars__30060/logs/end-2-2.xml
f48aebfaba87b758f6b70318097d84ce9cedfe48179df4957b4ce7d8ee285720  ext/sealed/pola-rs__polars__30060/logs/end.build.log
06446838a9c62c850a0fcdc6af8939e4423e1242c2fbb238fb6e1d9b2d8e8b1c  ext/sealed/pola-rs__polars__30060/logs/end.build.log.iid
8f601188d40a015eb740c0e34ddb85fff4bec3f083e36768d36220e391636d12  ext/sealed/pola-rs__polars__30060/pr.json
ed4c126fa4bcd3a9ed1f2bff0598e7d33ec1cbdb0ddd601743a7d3bac29d15ef  ext/sealed/runmaestro__maestro__1783/f2p.json
ed9ba0a91eab1e88964189bea195acd5872dd16faaf66eeeebb276c34b0add8d  ext/sealed/runmaestro__maestro__1783/logs/base-1.log
895030b14e0241d8ee4c02e5a00cd861e10c02a7e3789d0bbed1a5baf4d35077  ext/sealed/runmaestro__maestro__1783/logs/base-1.xml
9cbc12518f7545994d03e3b1e76a7919f5c5554d11925507b194ff4b23a53a64  ext/sealed/runmaestro__maestro__1783/logs/end-1-1.log
482c1f7b3adcc7a92c5ba4c4a0c90e81d09f42d817b6e2c8229f8c29591a6d8a  ext/sealed/runmaestro__maestro__1783/logs/end-1-1.xml
8bae57b918694d43f70d67b637cd3d250f201205f4dcce9425d3f3036ed4ebae  ext/sealed/runmaestro__maestro__1783/logs/end-1-2.log
1cd9c7ecbfde99fc493b8f8fcf8c272146fcd2c8bd3495f055d0d68c08ca8d48  ext/sealed/runmaestro__maestro__1783/logs/end-1-2.xml
1dfcb54720c074a62ca2094d9b01f1a69eb3133a48b8d3c2ee852ce58f0c7c29  ext/sealed/runmaestro__maestro__1783/logs/end.build.log
fccab2c9d1d7e0336adf9752f811e6069c5ead8fec24904dba5feee205785204  ext/sealed/runmaestro__maestro__1783/logs/end.build.log.iid
191659a96f4fa20e69ab71a45efe625baba665e70b06224d471bd957a6f3be61  ext/sealed/runmaestro__maestro__1783/pr.json
58e446923dd5c6d46873b24911d4018402d74ef8f55f086046adef44a8bcae8d  ext/sealed/rust-lang__cargo__17562/diag-end.reply.md
8da297b0918f89ae7dddc622f7d6d382c6f47748413a5f2320584668f2036629  ext/sealed/rust-lang__cargo__17562/diag-end.reply.md.run.json
2c8d9de2312b4910b31f4b49eb161c1fb06a2a9fec16b5b04910abcdb27d157b  ext/sealed/rust-lang__cargo__17562/f2p.json
8fb4de436dbe6f6ee4a38ee77c98a77eb79e39fd3a74842c94011d5755a35be7  ext/sealed/rust-lang__cargo__17562/logs/base-3.log
b3846b60671b915aced44920f406d0b16fc3ccfa9c0a5092ce426e817f0e33c6  ext/sealed/rust-lang__cargo__17562/logs/base-3.xml
a300140b94354a187eb70597df9540dee83dd1197f923b0e058aad63847b367b  ext/sealed/rust-lang__cargo__17562/logs/end-3-1.log
835e3625f3ca81cb9098cd9f8611d41a31bdf214cb6a5b2e5b3e6ad2961f40a9  ext/sealed/rust-lang__cargo__17562/logs/end-3-1.xml
78c20f5f1628688077dbce479ac7b62f3182401186e5ebb921873f97c4361b0d  ext/sealed/rust-lang__cargo__17562/logs/end-3-2.log
ec23d255b74daf904b2129085ff92cb1134860a587fac71ae355b715812bc2f6  ext/sealed/rust-lang__cargo__17562/logs/end-3-2.xml
8da3cf08a1c39cf54ed98a969b707cee69e6dcf79867ea604559a33a0c709aab  ext/sealed/rust-lang__cargo__17562/logs/end.build.log
80ac4903d9ab4fa966677df89df68d7f9bbb3ca669b1bda6f895c1f739f175c7  ext/sealed/rust-lang__cargo__17562/logs/end.build.log.iid
d921f900babbdda6c98f53a4df5bfea3b9a2647885fa95197e96ab876ecaf7e9  ext/sealed/rust-lang__cargo__17562/pr.json
f14546900f8bf0f3ea44f2baedc6ea082c51538568c36f9549636900a59a0e6e  ext/sealed/servo__servo__47685/f2p.json
26f1bc16c7b34b5feabf416b6d522b6e4e5fd67a2ff36507be3cfb1a708753f2  ext/sealed/servo__servo__47685/logs/base-2.log
638b364d47b040dfd514e2b0f243c7f31928ab9bce7be3b3e03c0351c76e2732  ext/sealed/servo__servo__47685/logs/base-2.xml
4237c2ab83250edb7e73730a0c2e98e99d2d139c40710337106d60a153150c4d  ext/sealed/servo__servo__47685/logs/end-2-1.log
c03b04c871fbac03c2932175a51c9b232fef295798882be5a3a1cd764ab5c68a  ext/sealed/servo__servo__47685/logs/end-2-1.xml
fa1b7f732228cc281a431b4c29c5b6775e35db218ae49b2b932e59f7a45f12b0  ext/sealed/servo__servo__47685/logs/end-2-2.log
b47b78bebb11ca29af07a596f2f3acc5c69799e4c459f60972089b413f3fd2c1  ext/sealed/servo__servo__47685/logs/end-2-2.xml
bc796db31ba0f9bcf6de4517067bfd707332d4d513cde6ef9fed8bff1e9e5a86  ext/sealed/servo__servo__47685/logs/end.build.log
b78007b9acf63ec3b416dc354979054e117cea7853b0749f3d438910740675bc  ext/sealed/servo__servo__47685/logs/end.build.log.iid
8279a4f7c062a642bcdb00779a670603b81094900e111e13c7c8d3cec5012210  ext/sealed/servo__servo__47685/pr.json
8c7949be7e219dac1d19c8782db3ec7e868760902d51b3708748e262fd7861a7  ext/sealed/super-productivity__super-productivity__10055/pr.json
80c717993ef26882a982271bd4cff6884a7ec2ce7f752b4aa8a251a66acae953  ext/sealed/super-productivity__super-productivity__11066/pr.json
db05fbeaf9c7e58e636356c864d14b50b363078810749e93911e27697f28c6ff  ext/sealed/super-productivity__super-productivity__11313/f2p.json
9b9cc1438ea67de9e3e473a87141953fe9879410e041e5f95da045d09fda7e4e  ext/sealed/super-productivity__super-productivity__11313/logs/base-1.log
9f8051ba58587467ea611f9c5c26f2ff5ed16d4903896829239a581ba2fd74ba  ext/sealed/super-productivity__super-productivity__11313/logs/base-1.xml
cac7b2531c16dacf9f985383389ff36ed85412c7464af41c5201d4ee0dd3d003  ext/sealed/super-productivity__super-productivity__11313/logs/end-1-1.log
9ab5a3568f866a838ec31f2c64fc7915a4b1077d03f1b3f3aa82ab41d92bab15  ext/sealed/super-productivity__super-productivity__11313/logs/end-1-1.xml
d7382e3ee68de9df27080710da4a269a3ef35402675126b5d005fce89df9f6ea  ext/sealed/super-productivity__super-productivity__11313/logs/end-1-2.log
62dbb0550e04a531b9d3a7f0967d12bc77996ca33deb8086f365d5e0afd78f0c  ext/sealed/super-productivity__super-productivity__11313/logs/end-1-2.xml
d0d1d3f7970d4a5e9e8c5e5b6d71d758821c2cb27ba6ef284248b5da7af6f4ce  ext/sealed/super-productivity__super-productivity__11313/logs/end.build.log
1cd73c9f97a4dcda4836f2fdee6463398381c92bf9004a83fdc9d6fb796a6c60  ext/sealed/super-productivity__super-productivity__11313/logs/end.build.log.iid
1cf28a4626286efcc031118def6dd58201b54b6b79aa242e900a7ccae93a3f73  ext/sealed/super-productivity__super-productivity__11313/pr.json
eea41412bd06c27630ce4974f677600980f1d1bb4e9e9315e2916be04fca4db8  ext/sealed/swc-project__swc__12010/f2p.json
682eed8d1e3c1a3aa2ef7306d8c8dbebccb099307472870986e20eb69d8ae5cb  ext/sealed/swc-project__swc__12010/logs/base-4.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/base-4.xml
3fa4cbe16d67b9e63d7019966b3c76d095c2f09c90431de913a22e8e3ee0761c  ext/sealed/swc-project__swc__12010/logs/base-5.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/base-5.xml
125696e3f75989ac425b237e3ac02b5184ae37375ef5fe0d72ec49d1dedaf984  ext/sealed/swc-project__swc__12010/logs/end-4-1.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-4-1.xml
9ea952accc9d12a5d32f2909ef3b64d41e99b01ecb40da13d5b131fc8480c686  ext/sealed/swc-project__swc__12010/logs/end-4-2.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-4-2.xml
e429ca4c5c52ce4aee2592b29e29503d7e2ac597761d667da7954b28ad0a5f83  ext/sealed/swc-project__swc__12010/logs/end-5-1.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-5-1.xml
4949653776dae2ec62d2dbdceaca8ec1cb1364a62bea43b5cdd205debc66430a  ext/sealed/swc-project__swc__12010/logs/end-5-2.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-5-2.xml
924f2304617ce53468eabf83fe717aa3a54f0df732da683a9d1d6578a35762e1  ext/sealed/swc-project__swc__12010/logs/end.build.log
f13062ea0de77220b68e78c5245eaf2259af122bfc9e7776f904c7418be7805f  ext/sealed/swc-project__swc__12010/logs/end.build.log.iid
9cf6c0cf5e68e29f96231a2b5ac5c41afddcd3446f6f9d426e91ecb784c96b37  ext/sealed/swc-project__swc__12010/pr.json
d7aaf1d2613aa099684a813038545643afa430d751f0ad5861348c4036eec246  ext/sealed/the-open-engine__zeroshot__944/f2p.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  ext/sealed/the-open-engine__zeroshot__944/logs/base-1.log
77d6c2e30595b9275756572760813336416d8ba38fa6be20b7c9d034e998bcae  ext/sealed/the-open-engine__zeroshot__944/logs/base-1.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  ext/sealed/the-open-engine__zeroshot__944/logs/end-1-1.log
08cc57e1be7403b544821817e0a31206c0c794379c133450e9cb0eed1ed49756  ext/sealed/the-open-engine__zeroshot__944/logs/end-1-1.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  ext/sealed/the-open-engine__zeroshot__944/logs/end-1-2.log
8aaae707e574d04847644bff6c97d6093941a6391bd6f69b4cde0cf4880e541e  ext/sealed/the-open-engine__zeroshot__944/logs/end-1-2.xml
f8de06a4def7449e515144ea342312faa95b6651858cf18e85f71d1ec7f15585  ext/sealed/the-open-engine__zeroshot__944/logs/end.build.log
d824f893e0f437d0f6ef95e0b8fc8fc324000d5e721745a035bf27a863e7964b  ext/sealed/the-open-engine__zeroshot__944/logs/end.build.log.iid
62c5fac188cf76e593e3650c3f9966dfce574df56e08ae124e9ef141221311dc  ext/sealed/the-open-engine__zeroshot__944/pr.json
393dd04b9b406d9087b6ed2f545f892025a37a0fcf0f449d7d5604c380a92a8b  ext/sealed/tokio-rs__toasty__1238/diag-end.reply.md
feb8c1f8ba8ee7215dc109ef2fd8d62a2096cb449d0c88b597f534e8c90eb679  ext/sealed/tokio-rs__toasty__1238/diag-end.reply.md.run.json
3a8aeb5ac9a0cbf854e906331fe80a2bca881df9b9128a5538441c3e2fa12c48  ext/sealed/tokio-rs__toasty__1238/f2p.json
8e62b51afb2fdd07d6b0462d6e5ab3bf9dab9d5e67dded60f2a2e775e7cef179  ext/sealed/tokio-rs__toasty__1238/logs/base-3.log
28af6fa7794f4d47b61a11144f59b9324ac734256314578c42d591097b478d04  ext/sealed/tokio-rs__toasty__1238/logs/base-3.xml
6d71b7660906a349a6780d796857cfa8c0ae9023f7a2aff3f2fb4fdf202261c4  ext/sealed/tokio-rs__toasty__1238/logs/end-3-1.log
a1e33498452e0143bff9aaa64aa2bf37f95e45617c2fe1cb3fd7b34c3137caa6  ext/sealed/tokio-rs__toasty__1238/logs/end-3-1.xml
dc559de9a5aa287ccfacd03fdb1990470d5411d2e9826dd2fed9cd3b442ac9db  ext/sealed/tokio-rs__toasty__1238/logs/end-3-2.log
597f25172b97e4f67a0770151bb065ba00a0b9d89b0050a1bb530551f7de1855  ext/sealed/tokio-rs__toasty__1238/logs/end-3-2.xml
0c961924c1b82c7911447ef7fa3f0f1274a3330c17a910c05bfc6de5845ba79c  ext/sealed/tokio-rs__toasty__1238/logs/end.build.log
5cddcd20b2e137acc2ac9de9a6b18f6511fd243ed5c86b572e5b5e352d5b1573  ext/sealed/tokio-rs__toasty__1238/logs/end.build.log.iid
19d69ee3082ee1248c11f1b33b94226745237640cd2695ea97fb58c3d3da8e0f  ext/sealed/tokio-rs__toasty__1238/pr.json
ef2c74815f84650d648cb2ece5f7d3a7e60a75d084092f1b025fbbf4a8d05e60  ext/sealed/uutils__coreutils__14754/pr.json
559aead08264d5795d3909718cdd05abd49572e84fe55590eef31a88a08fdffd  ext/sealed/voidzero-dev__vite-plus__2667/diag.reply.md
16498eae11f27ea769d648fb2263029730d634cc5a726dd31605edd986884fa0  ext/sealed/voidzero-dev__vite-plus__2667/diag.reply.md.run.json
125bc04c17c586e05316fe257da6f65627b1b7e6f711291eaa91d07fd05e5cca  ext/sealed/voidzero-dev__vite-plus__2667/diag2.reply.md
b9175a53a7d0dc0e87e296de09de718a6f969cb7cac301ad3ef040b27f0f06e9  ext/sealed/voidzero-dev__vite-plus__2667/diag2.reply.md.run.json
f454b87a246a77f798dc1709379b8523d03bbee6d0ddef40ed85257e11df6958  ext/sealed/voidzero-dev__vite-plus__2667/f2p.json
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-1.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-1.xml
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-2.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-2.xml
5dda10d5428b4de5b6f1dcea524d2c8fc7c0bae8699f2c4395a0dc974a0f033f  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-3.log
10bed695917b5c56e2faa966147be7d34b07634ad85153bbfdf1612e559b235e  ext/sealed/voidzero-dev__vite-plus__2667/logs/base-3.xml
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-1-1.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-1-1.xml
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-1-2.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-1-2.xml
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-2-1.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-2-1.xml
28bf3c8bda6bbe5971111f31c470d474835cf1ef2b42a4538ed2c4307e132057  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-2-2.log
c12f033ca32130a31896bed9863221cc3b6e03be2b2019ddbcf60986d1173122  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-2-2.xml
cf525c701671229abeb8b77b5f91fa474efbde1fdbe8b52a11122b171d717671  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-3-1.log
92cca8a79c5442e3625018f6c59b4e1ee57d47f18c2eefeffec688f6677e1db5  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-3-1.xml
82e557704179e5ee58a1fef4b5de1706e60a14b37f36521938b202c7a28c25a1  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-3-2.log
78418f8c51446ca714cd80af64220460441286e0128f52fa9c88817439c3468b  ext/sealed/voidzero-dev__vite-plus__2667/logs/end-3-2.xml
3a82edd4e8e2dc4f82e4b42adeb10a971b6cbff5642e18fa8196d1026fadf77a  ext/sealed/voidzero-dev__vite-plus__2667/logs/end.build.log
7a812cabc1206cf0c7ccfcb6b7d9cdd3fd95cf4c87b4c7e1a616ac8ad8a91598  ext/sealed/voidzero-dev__vite-plus__2667/logs/end.build.log.iid
cb3285f04aa88f6bc5181d5ac2a900e42c5abc5c065c7a748c40164c98c65c10  ext/sealed/voidzero-dev__vite-plus__2667/pr.json
c129a40f528645c41a1a90262e5d36216e6f8d444bf4c69a307f66ca9bccbcf0  ext/sealed/zulip__zulip__39943/pr.json
```

## Tools

`bench/` at `ea48116087273ed879171788f59e40b5543287a3` (`git rev-parse HEAD` before this lock's commit); `git status --short bench` empty.

## Docker left

- `docker ps -a --filter name=bench-ext- --format '{{.Names}}'`: 190 containers, all from the gated test runs (`bench-ext-fx*` fixtures and the decoy `bench-ext-other`). No candidate container is left.
- `docker images 'bench-ext/*' --format '{{.Repository}}:{{.Tag}}'`: 98 images, `bench-ext/probe:net` and 97 fixture images. No candidate image is left: accepted tasks keep `imageDigests` in `meta.json`, and step 5 rebuilds.
- `removed.txt`: 228 lines.

<details><summary>containers</summary>

```
bench-ext-fx0d65j0__app__1-base-1
bench-ext-fx0d65j0__app__1-probe-reuse-1
bench-ext-fx0jocna__app__1-base-1
bench-ext-fx0jocna__app__1-end-1-1
bench-ext-fx0jocna__app__1-end-1-2
bench-ext-fx0jocna__app__1-probe-2
bench-ext-fx0od47f__app__1-base-1
bench-ext-fx0od47f__app__1-end-1-1
bench-ext-fx0od47f__app__1-end-1-2
bench-ext-fx0od47f__app__1-probe-reuse-1
bench-ext-fx0p88de__app__1-probe-1
bench-ext-fx0p88de__app__1-probe-2
bench-ext-fx0p88de__app__1-probe-3
bench-ext-fx1899o5__app__1-base-1
bench-ext-fx1899o5__app__1-end-1-1
bench-ext-fx1899o5__app__1-end-1-2
bench-ext-fx1899o5__app__1-probe-reuse-1
bench-ext-fx2uhtls__app__1-base-1
bench-ext-fx2uhtls__app__1-end-1-1
bench-ext-fx2uhtls__app__1-end-1-2
bench-ext-fx2uhtls__app__1-probe-2
bench-ext-fx42gk1z__app__1-probe-1
bench-ext-fx42gk1z__app__1-probe-2
bench-ext-fx42gk1z__app__1-probe-3
bench-ext-fx468dph__app__1-base-1
bench-ext-fx468dph__app__1-probe-reuse-1
bench-ext-fx5kx63k__app__1-base-1
bench-ext-fx5kx63k__app__1-end-1-1
bench-ext-fx5kx63k__app__1-end-1-2
bench-ext-fx5kx63k__app__1-probe-reuse-1
bench-ext-fx5rjyry__app__1-base-1
bench-ext-fx5rjyry__app__1-end-1-1
bench-ext-fx5rjyry__app__1-end-1-2
bench-ext-fx5rjyry__app__1-probe-2
bench-ext-fx652fn2__app__1-base-1
bench-ext-fx652fn2__app__1-end-1-1
bench-ext-fx652fn2__app__1-end-1-2
bench-ext-fx652fn2__app__1-probe-reuse-1
bench-ext-fx67zsqi__app__1-base-1
bench-ext-fx67zsqi__app__1-end-1-1
bench-ext-fx67zsqi__app__1-end-1-2
bench-ext-fx67zsqi__app__1-probe-2
bench-ext-fx6v711n__app__1-base-1
bench-ext-fx6v711n__app__1-probe-reuse-1
bench-ext-fx885067__app__1-base-1
bench-ext-fx885067__app__1-end-1-1
bench-ext-fx885067__app__1-end-1-2
bench-ext-fx885067__app__1-probe-reuse-1
bench-ext-fx99xij5__app__1-base-1
bench-ext-fx99xij5__app__1-end-1-1
bench-ext-fx99xij5__app__1-end-1-2
bench-ext-fx99xij5__app__1-probe-reuse-1
bench-ext-fx9crd4r__app__1-base-1
bench-ext-fx9crd4r__app__1-end-1-1
bench-ext-fx9crd4r__app__1-end-1-2
bench-ext-fx9crd4r__app__1-probe-1
bench-ext-fx9crd4r__app__1-probe-reuse-1
bench-ext-fx9ymbh9__app__1-base-1
bench-ext-fx9ymbh9__app__1-probe-reuse-1
bench-ext-fxadbl5b__app__1-base-1
bench-ext-fxadbl5b__app__1-end-1-1
bench-ext-fxadbl5b__app__1-end-1-2
bench-ext-fxadbl5b__app__1-probe-reuse-1
bench-ext-fxb3tolx__app__1-base-1
bench-ext-fxb3tolx__app__1-end-1-1
bench-ext-fxb3tolx__app__1-end-1-2
bench-ext-fxb3tolx__app__1-probe-1
bench-ext-fxb3tolx__app__1-probe-reuse-1
bench-ext-fxc2v7c7__app__1-base-1
bench-ext-fxc2v7c7__app__1-end-1-1
bench-ext-fxc2v7c7__app__1-end-1-2
bench-ext-fxc2v7c7__app__1-probe-reuse-1
bench-ext-fxcde38b__app__1-base-1
bench-ext-fxcde38b__app__1-end-1-1
bench-ext-fxcde38b__app__1-end-1-2
bench-ext-fxcde38b__app__1-probe-reuse-1
bench-ext-fxejtqy8__app__1-base-1
bench-ext-fxejtqy8__app__1-end-1-1
bench-ext-fxejtqy8__app__1-end-1-2
bench-ext-fxejtqy8__app__1-probe-reuse-1
bench-ext-fxf5kmrj__app__1-base-1
bench-ext-fxf5kmrj__app__1-end-1-1
bench-ext-fxf5kmrj__app__1-end-1-2
bench-ext-fxf5kmrj__app__1-probe-2
bench-ext-fxgg6x4r__app__1-base-1
bench-ext-fxgg6x4r__app__1-end-1-1
bench-ext-fxgg6x4r__app__1-end-1-2
bench-ext-fxgg6x4r__app__1-probe-2
bench-ext-fxgv7rl0__app__1-base-1
bench-ext-fxgv7rl0__app__1-probe-reuse-1
bench-ext-fxjfnnlh__app__1-probe-1
bench-ext-fxjfnnlh__app__1-probe-2
bench-ext-fxjfnnlh__app__1-probe-3
bench-ext-fxjikocq__app__1-base-1
bench-ext-fxjikocq__app__1-end-1-1
bench-ext-fxjikocq__app__1-end-1-2
bench-ext-fxjikocq__app__1-probe-reuse-1
bench-ext-fxjmfrsg__app__1-base-1
bench-ext-fxjmfrsg__app__1-end-1-1
bench-ext-fxjmfrsg__app__1-end-1-2
bench-ext-fxjmfrsg__app__1-probe-reuse-1
bench-ext-fxkepp6q__app__1-probe-1
bench-ext-fxkepp6q__app__1-probe-2
bench-ext-fxkepp6q__app__1-probe-3
bench-ext-fxlberl8__app__1-base-1
bench-ext-fxlberl8__app__1-end-1-1
bench-ext-fxlberl8__app__1-end-1-2
bench-ext-fxlberl8__app__1-probe-2
bench-ext-fxlquqou__app__1-base-1
bench-ext-fxlquqou__app__1-end-1-1
bench-ext-fxlquqou__app__1-end-1-2
bench-ext-fxlquqou__app__1-probe-2
bench-ext-fxm1ovi6__app__1-base-1
bench-ext-fxm1ovi6__app__1-probe-reuse-1
bench-ext-fxm2xkls__app__1-base-1
bench-ext-fxm2xkls__app__1-end-1-1
bench-ext-fxm2xkls__app__1-end-1-2
bench-ext-fxm2xkls__app__1-probe-reuse-1
bench-ext-fxm5ea2z__app__1-probe-1
bench-ext-fxm5ea2z__app__1-probe-2
bench-ext-fxm5ea2z__app__1-probe-3
bench-ext-fxn51kix__app__1-base-1
bench-ext-fxn51kix__app__1-end-1-1
bench-ext-fxn51kix__app__1-end-1-2
bench-ext-fxn51kix__app__1-probe-2
bench-ext-fxntoniw__app__1-probe-1
bench-ext-fxntoniw__app__1-probe-2
bench-ext-fxntoniw__app__1-probe-3
bench-ext-fxnvytgj__app__1-base-1
bench-ext-fxnvytgj__app__1-end-1-1
bench-ext-fxnvytgj__app__1-end-1-2
bench-ext-fxnvytgj__app__1-probe-2
bench-ext-fxo40jr8__app__1-base-1
bench-ext-fxo40jr8__app__1-end-1-1
bench-ext-fxo40jr8__app__1-end-1-2
bench-ext-fxo40jr8__app__1-probe-reuse-1
bench-ext-fxoqwua1__app__1-base-1
bench-ext-fxoqwua1__app__1-end-1-1
bench-ext-fxoqwua1__app__1-end-1-2
bench-ext-fxoqwua1__app__1-probe-1
bench-ext-fxoqwua1__app__1-probe-reuse-1
bench-ext-fxp5udbb__app__1-probe-1
bench-ext-fxp5udbb__app__1-probe-2
bench-ext-fxp5udbb__app__1-probe-3
bench-ext-fxpzhab1__app__1-base-1
bench-ext-fxpzhab1__app__1-end-1-1
bench-ext-fxpzhab1__app__1-end-1-2
bench-ext-fxpzhab1__app__1-probe-2
bench-ext-fxr0kzz5__app__1-base-1
bench-ext-fxr0kzz5__app__1-end-1-1
bench-ext-fxr0kzz5__app__1-end-1-2
bench-ext-fxr0kzz5__app__1-probe-reuse-1
bench-ext-fxrosbpp__app__1-base-1
bench-ext-fxrosbpp__app__1-end-1-1
bench-ext-fxrosbpp__app__1-end-1-2
bench-ext-fxrosbpp__app__1-probe-reuse-1
bench-ext-fxslm9x6__app__1-base-1
bench-ext-fxslm9x6__app__1-end-1-1
bench-ext-fxslm9x6__app__1-end-1-2
bench-ext-fxslm9x6__app__1-probe-reuse-1
bench-ext-fxtm8s1x__app__1-base-1
bench-ext-fxtm8s1x__app__1-probe-reuse-1
bench-ext-fxtr6bky__app__1-base-1
bench-ext-fxtr6bky__app__1-probe-reuse-1
bench-ext-fxu00w5h__app__1-probe-1
bench-ext-fxu00w5h__app__1-probe-2
bench-ext-fxu00w5h__app__1-probe-3
bench-ext-fxuvux3q__app__1-base-1
bench-ext-fxuvux3q__app__1-end-1-1
bench-ext-fxuvux3q__app__1-end-1-2
bench-ext-fxuvux3q__app__1-probe-1
bench-ext-fxwn54xq__app__1-base-1
bench-ext-fxwn54xq__app__1-end-1-1
bench-ext-fxwn54xq__app__1-end-1-2
bench-ext-fxwn54xq__app__1-probe-reuse-1
bench-ext-fxwnwf9k__app__1-base-1
bench-ext-fxwnwf9k__app__1-end-1-1
bench-ext-fxwnwf9k__app__1-end-1-2
bench-ext-fxwnwf9k__app__1-probe-2
bench-ext-fxx6s6av__app__1-base-1
bench-ext-fxx6s6av__app__1-probe-reuse-1
bench-ext-fxxxif2e__app__1-probe-1
bench-ext-fxxxif2e__app__1-probe-2
bench-ext-fxxxif2e__app__1-probe-3
bench-ext-fxz85fap__app__1-base-1
bench-ext-fxz85fap__app__1-end-1-1
bench-ext-fxz85fap__app__1-end-1-2
bench-ext-fxz85fap__app__1-probe-1
bench-ext-fxz85fap__app__1-probe-reuse-1
bench-ext-other
```
</details>

<details><summary>images</summary>

```
bench-ext/fx0d65j0__app__1:9d77abf
bench-ext/fx0d65j0__app__1:a9f5a4c
bench-ext/fx0jocna__app__1:b5cdaa7
bench-ext/fx0jocna__app__1:ce9680d
bench-ext/fx0od47f__app__1:b5cdaa7
bench-ext/fx0od47f__app__1:ce9680d
bench-ext/fx0p88de__app__1:db6a33f
bench-ext/fx1899o5__app__1:22135a0
bench-ext/fx1899o5__app__1:495c367
bench-ext/fx2uhtls__app__1:b5cdaa7
bench-ext/fx2uhtls__app__1:ce9680d
bench-ext/fx42gk1z__app__1:f5a6d91
bench-ext/fx468dph__app__1:2654416
bench-ext/fx468dph__app__1:aa35d45
bench-ext/fx5kx63k__app__1:b5cdaa7
bench-ext/fx5kx63k__app__1:ce9680d
bench-ext/fx5rjyry__app__1:db6a33f
bench-ext/fx5rjyry__app__1:f78216a
bench-ext/fx652fn2__app__1:9d77abf
bench-ext/fx652fn2__app__1:a9f5a4c
bench-ext/fx67zsqi__app__1:6cafd10
bench-ext/fx67zsqi__app__1:6dd7619
bench-ext/fx6v711n__app__1:db6a33f
bench-ext/fx6v711n__app__1:f78216a
bench-ext/fx885067__app__1:bae4e02
bench-ext/fx885067__app__1:eb2937c
bench-ext/fx99xij5__app__1:1dfea0b
bench-ext/fx99xij5__app__1:ea3e008
bench-ext/fx9crd4r__app__1:678235e
bench-ext/fx9crd4r__app__1:8f5161d
bench-ext/fx9ymbh9__app__1:b5cdaa7
bench-ext/fx9ymbh9__app__1:ce9680d
bench-ext/fxadbl5b__app__1:1dfea0b
bench-ext/fxadbl5b__app__1:ea3e008
bench-ext/fxb3tolx__app__1:4342324
bench-ext/fxb3tolx__app__1:f5a6d91
bench-ext/fxc2v7c7__app__1:2654416
bench-ext/fxc2v7c7__app__1:aa35d45
bench-ext/fxcde38b__app__1:db6a33f
bench-ext/fxcde38b__app__1:f78216a
bench-ext/fxejtqy8__app__1:4342324
bench-ext/fxejtqy8__app__1:f5a6d91
bench-ext/fxf5kmrj__app__1:db6a33f
bench-ext/fxf5kmrj__app__1:f78216a
bench-ext/fxgg6x4r__app__1:4342324
bench-ext/fxgg6x4r__app__1:f5a6d91
bench-ext/fxgv7rl0__app__1:1dfea0b
bench-ext/fxgv7rl0__app__1:ea3e008
bench-ext/fxjfnnlh__app__1:1dfea0b
bench-ext/fxjikocq__app__1:bae4e02
bench-ext/fxjikocq__app__1:eb2937c
bench-ext/fxjmfrsg__app__1:db6a33f
bench-ext/fxjmfrsg__app__1:f78216a
bench-ext/fxkepp6q__app__1:9d77abf
bench-ext/fxlberl8__app__1:9d77abf
bench-ext/fxlberl8__app__1:a9f5a4c
bench-ext/fxlquqou__app__1:9d77abf
bench-ext/fxlquqou__app__1:a9f5a4c
bench-ext/fxm1ovi6__app__1:6cafd10
bench-ext/fxm1ovi6__app__1:6dd7619
bench-ext/fxm2xkls__app__1:678235e
bench-ext/fxm2xkls__app__1:8f5161d
bench-ext/fxm5ea2z__app__1:22135a0
bench-ext/fxn51kix__app__1:678235e
bench-ext/fxn51kix__app__1:8f5161d
bench-ext/fxntoniw__app__1:b5cdaa7
bench-ext/fxnvytgj__app__1:1dfea0b
bench-ext/fxnvytgj__app__1:ea3e008
bench-ext/fxo40jr8__app__1:678235e
bench-ext/fxo40jr8__app__1:8f5161d
bench-ext/fxoqwua1__app__1:b5cdaa7
bench-ext/fxoqwua1__app__1:ce9680d
bench-ext/fxp5udbb__app__1:1d1e3cc
bench-ext/fxpzhab1__app__1:4342324
bench-ext/fxpzhab1__app__1:f5a6d91
bench-ext/fxr0kzz5__app__1:6cafd10
bench-ext/fxr0kzz5__app__1:6dd7619
bench-ext/fxrosbpp__app__1:22135a0
bench-ext/fxrosbpp__app__1:495c367
bench-ext/fxslm9x6__app__1:4342324
bench-ext/fxslm9x6__app__1:f5a6d91
bench-ext/fxtm8s1x__app__1:b5cdaa7
bench-ext/fxtm8s1x__app__1:ce9680d
bench-ext/fxtr6bky__app__1:678235e
bench-ext/fxtr6bky__app__1:8f5161d
bench-ext/fxu00w5h__app__1:6cafd10
bench-ext/fxuvux3q__app__1:bae4e02
bench-ext/fxuvux3q__app__1:eb2937c
bench-ext/fxwn54xq__app__1:6cafd10
bench-ext/fxwn54xq__app__1:6dd7619
bench-ext/fxwnwf9k__app__1:678235e
bench-ext/fxwnwf9k__app__1:8f5161d
bench-ext/fxx6s6av__app__1:4342324
bench-ext/fxx6s6av__app__1:f5a6d91
bench-ext/fxxxif2e__app__1:8f5161d
bench-ext/fxz85fap__app__1:9d77abf
bench-ext/fxz85fap__app__1:a9f5a4c
bench-ext/probe:net
```
</details>

## Open points

- The three s3 `PR tests do not pass at end` outs (swc#12010, panda#3925, iggy#4018) gave 0 JUnit cases in every run, the same pattern as vite-plus before the owning-tests rule. swc and panda were checked under the current brief. They were not diagnosed, so whether the repo or the recipe interface caused them is not known.
- During the "used in hstack" check, one first `rg` run over `<data>` used an `--glob '!ext/**'` that did not apply to an absolute path, so it also searched `ext/` (`raw/` and `sealed/` included) for the 19 repo names. It printed matching file names only, never content. Those results were discarded and the check was rerun with explicit paths.


## Superseding lock, 2026-11-03

This section supersedes the sample, the s3 walk summary and the hashes listed below it. Everything above that it does not name still holds.

### Reason

Three s3 candidates were out `PR tests do not pass at end` with 0 JUnit cases in every run. A structured sealed diagnosis (diag3, the same setup as vite-plus's) blamed the recipe for two of them (`cause: recipe`, `firstErrorKind: usage`, the script ran nothing) and the repo for the third. On the readable side, the probe and the PR's runs invoke `.bench-test.sh` the same way, each path one single-quoted word (always-run test with `[`, `]`, `@`, `$`, `(`, `)`, a space, `'`, `"`, a leading `-` and a newline), so there is no quoting gap. The registered instrument fix is the feedback round (prereg ruling 10, dated 2026-11-03), followed by one recheck pass and one re-lock. The dated stop rule is: a recheck happens only when a diagnosed failure class has a generic instrument fix that applies to every candidate; `recipe failed` outs are not reopened; findings after this pass are known limits.

Diagnoses by candidate (replies `sealed/<slug>/diag3.reply.md`; usage of the four: input 80, output 20430, cacheRead 4676960, cacheWrite 977256):

- s3 rank 3, swc-project/swc#12010: `{"linesRead":{"base-5.log":129,"end-5-1.log":129,"end-5-2.log":129,"base-4.log":129,"end-4-1.log":129,"end-4-2.log":129,"end.build.log":892,"end.build.log.iid":1,"base-5.xml":2,"end-5-1.xml":2,"end-5-2.xml":2,"base-4.xml":2,"end-4-1.xml":2,"end-4-2.xml":2,"5.probe.log":829,"reuse-swc-project__swc__12010-5.probe.log":429,"3.build.log":544,"4.build.log":342,"5.build.log":1660,"reuse-swc-project__swc__12010-5.build.log":1697},"argsTotal":5,"argsWithProbeExtensions":1,"argsRunnable":"some","scriptStage":"ran-nothing","firstErrorKind":"usage","ownsTestsRule":"not-applicable","cause":"recipe"}`
- s3 rank 6, chakra-ui/panda#3925: `{"linesRead":{"base-1.log":15,"base-2.log":15,"end-1-1.log":15,"end-1-2.log":15,"end-2-1.log":15,"end-2-2.log":15,"end.build.log":787,"2.probe.log":183,"reuse-chakra-ui__panda__3925-2.probe.log":183,"1.build.log":908,"2.build.log":1417,"reuse-chakra-ui__panda__3925-2.build.log":1507},"argsTotal":2,"argsWithProbeExtensions":2,"argsRunnable":"all","scriptStage":"ran-nothing","firstErrorKind":"usage","ownsTestsRule":"not-applicable","cause":"recipe"}`
- s3 rank 10, apache/iggy#4018: `{"linesRead":{"base-2.log":11,"end-2-1.log":11,"end-2-2.log":11,"base-2.xml":3,"end-2-1.xml":3,"end-2-2.xml":3,"end.build.log":1916,"end.build.log.iid":1,"1.build.log":3652,"2.build.log":1913,"reuse-apache__iggy__4018-2.build.log":2460,"2.probe.log":30,"reuse-apache__iggy__4018-2.probe.log":30},"argsTotal":1,"argsWithProbeExtensions":0,"argsRunnable":"0","scriptStage":"crash-before-run","firstErrorKind":"usage","ownsTestsRule":"followed","cause":"repo"}`
- s1 rank 7, fossasia/eventyay#4509: `{"linesRead":{"base-1.log":953,"end-1-1.log":953,"end-1-2.log":953,"base-1.xml":887,"end-1-1.xml":887,"end-1-2.xml":887,"end.build.log":405,"end.build.log.iid":1,"1.probe.log":181,"reuse-fossasia__eventyay__4509-1.probe.log":191,"1.build.log":1371,"reuse-fossasia__eventyay__4509-1.build.log":411},"argsTotal":1,"argsWithProbeExtensions":1,"argsRunnable":"all","scriptStage":"other","firstErrorKind":"other","ownsTestsRule":"not-applicable","cause":"recipe"}`

eventyay#4509 is `cause: recipe`, but its runs ran 6 cases each, so the feedback round's signature (no case and an error in all three runs) does not apply to it. It was not rechecked (stop rule), and its out is a known limit. iggy#4018 stays out (`cause: repo`).

### Fix and rechecks

- Fix commit `89d9e8a7e521cc8e64a258dd44470d50b34d3bec`:
  - `needsFeedback` and the feedback round in `check`: one round even at a spent budget, its prompt the brief plus only the fixed sentence; the runs are made again with the recipe that passes it.
  - `sampleOf`: a stack's first 8 accepted rows by rank.
  - Always-run tests for quoting, `needsFeedback` and `sampleOf` (more than 8 accepted). A gated fixture test checks the feedback round.
  - `bun test ./tests`: 273 pass, 12 skip, 0 fail. Gated file: 28 pass.
- `recheck: feedback round` rows for s3 ranks 3 and 6. Both rechecks ran with `ext check ... s3 <rank> --tier 1` (`<data>/ext/recheck.sh`), between equal `pgsnap` snapshots, each followed by the walk's removal step:
  - swc-project/swc#12010: `out of memory`. The feedback round passed (probe 254 cases), then the base run was OOMKilled. Under the user's decision of 2026-11-03 this out is reported to the user.
  - chakra-ui/panda#3925: `ok f2p=1 p2p=111`. The feedback round passed (probe 72 cases); base 111 cases, end 112 and 112. Image digests are in `meta.json`, and the images were removed.

### s3 walk summary (replaces the s3 row above)

| stack | ok rows listed | last checked rank | checked (verdict) | ok | outs by reason | repo cap | not checked | repos in sample (max per repo) |
|---|---|---|---|---|---|---|---|---|
| s3 | 7063 | 16 | 16 | 9 (8 in the sample) | out of memory 2, recipe failed 2, PR tests do not pass at end 1, no fail-to-pass test 1, rebase merge of several commits 1 | 0 | 7047 | 7 (2) |

s1 and s2 are unchanged. The sample is `sampleOf`, the first 8 accepted rows by rank per stack. the-open-engine/zeroshot#944 (rank 16) stays `ok` in `walk.tsv` but is past the 8th accepted s3 row. It is the first s3 row a later need takes (ruling 14).

### Sample (replaces the table above)

| task | id | rank | method | f2p | edit history | platform | cold setup |
|---|---|---|---|---|---|---|---|
| s1-01 | django-commons/django-debug-toolbar#2502 | 1 | squash | 2 | none | linux/arm64 | no |
| s1-02 | fossasia/eventyay#4689 | 2 | squash | 1 | none | linux/arm64 | no |
| s1-03 | openfoodfoundation/openfoodnetwork#14719 | 3 | merge | 24 | none | linux/arm64 | no |
| s1-04 | Open-Source-Legal/OpenContracts#2124 | 5 | merge | 23 | none | linux/arm64 | no |
| s1-05 | netbox-community/netbox#23175 | 6 | squash | 2 | none | linux/arm64 | no |
| s1-06 | paperless-ngx/paperless-ngx#13486 | 8 | single | 23 | none | linux/arm64 | yes |
| s1-07 | netbox-community/netbox#23277 | 9 | single | 3 | none | linux/arm64 | no |
| s1-08 | Open-Source-Legal/OpenContracts#2371 | 11 | merge | 5 | none | linux/arm64 | no |
| s2-01 | RunMaestro/Maestro#1783 | 1 | single | 8 | none | linux/arm64 | no |
| s2-02 | coder/xum#7059 | 2 | squash | 66 | none | linux/arm64 | no |
| s2-03 | CherryHQ/cherry-studio#19874 | 4 | squash | 1 | none | linux/arm64 | no |
| s2-04 | coder/xum#5191 | 5 | squash | 32 | none | linux/arm64 | no |
| s2-05 | CherryHQ/cherry-studio#18688 | 6 | single | 1 | none | linux/arm64 | no |
| s2-06 | OpenWhispr/openwhispr#2643 | 11 | squash | 21 | none | linux/arm64 | no |
| s2-07 | IsmaelMartinez/teams-for-linux#2778 | 12 | squash | 13 | none | linux/arm64 | no |
| s2-08 | super-productivity/super-productivity#11313 | 13 | single | 2 | none | linux/arm64 | yes |
| s3-01 | voidzero-dev/vite-plus#2667 | 2 | squash | 2 | none | linux/arm64 | no |
| s3-02 | tokio-rs/toasty#1238 | 4 | single | 5 | none | linux/arm64 | no |
| s3-03 | rust-lang/cargo#17562 | 5 | merge | 5 | none | linux/arm64 | no |
| s3-04 | chakra-ui/panda#3925 | 6 | squash | 1 | none | linux/arm64 | no |
| s3-05 | lancedb/lancedb#4486 | 8 | squash | 21 | none | linux/arm64 | no |
| s3-06 | nautechsystems/nautilus_trader#4813 | 9 | single | 63 | none | linux/arm64 | no |
| s3-07 | pola-rs/polars#30060 | 11 | squash | 3 | none | linux/arm64 | yes |
| s3-08 | pola-rs/polars#29923 | 14 | single | 3 | none | linux/arm64 | yes |

Cold-setup repos: s1 `paperless-ngx/paperless-ngx`, s2 `super-productivity/super-productivity` (both unchanged), s3 **`pola-rs/polars`** (was `the-open-engine/zeroshot`).

Delta: chakra-ui/panda#3925 entered s3, as s3-04. the-open-engine/zeroshot#944 left. The s3 task ids after s3-03 shift by one: lancedb#4486 s3-05, nautilus_trader#4813 s3-06, polars#30060 s3-07, polars#29923 s3-08. s1 and s2 are unchanged.

### Checks for the new sample

8 `ok` per stack in the sample; at most 2 per repo; 6, 6 and 7 repos; no rank gap. For `chakra-ui/panda`, the same `rg` as above found only `progress/step4/{candidates-1,repos-1,walk}.tsv` in this repo and nothing in `<data>` outside `ext/` and `heldout/`. All 27 clones are bare.

### Hashes (changed and new files; paths relative to `<data>` unless under `progress/`)

`raw/` still matches `raw.sha256`. `groups.json`, `candidates-1.tsv`, `repos-1.tsv`, `raw.sha256`, every `issue.json` and every hash above not listed here are unchanged.

```
a200de5b1785dcec02c45ebdafe867f030847a10d3e07c54fb684555a83e76d1  progress/step4/sample.tsv
0b343c4be1bc5250d50c7ad9b773de1ce7f41271502e35b61ec4d8d3fa68fc24  progress/step4/walk.tsv
0b343c4be1bc5250d50c7ad9b773de1ce7f41271502e35b61ec4d8d3fa68fc24  ext/walk.tsv
90cbaa9cd8e917d14439872d1e7911f58cf961ed0c4f77b482d770bb90f9c60d  ext/recipes/chakra-ui__panda/recipe.json
44c2ced3fd65c1cea27bde3762e6f971e78ad9380e820b4f95bbfb97cd6c4467  ext/recipes/swc-project__swc/recipe.json
ad474a13d12a6ceb02ca3624117d4abb11d1baa5ef54a21f542867c0b92571af  ext/tasks/chakra-ui__panda__3925/meta.json
3f76e4ac7b18e9613b0f84fd6d8327d4b1d8c9a06f0e18fa40abc9a6d94c4f0f  ext/tasks/swc-project__swc__12010/meta.json
c75cce0e89a474596c425753e4f7d47119b4104eadcbaeced355270b3046974e  ext/sealed/apache__iggy__4018/diag3.reply.md
93917ea8b5d75c43ee06eefc8a63b28450aee4f278e0ee941cf1b59427473f2f  ext/sealed/apache__iggy__4018/diag3.reply.md.run.json
9c335d92568c099583ae9432b259f71c7bb9ba5aee5abea5e2c012c296062136  ext/sealed/chakra-ui__panda__3925/diag3.reply.md
9f2763e4ec853c748fa61e90567033ef3dafb05f7c882d9a94f26be9b1d872a8  ext/sealed/chakra-ui__panda__3925/diag3.reply.md.run.json
67a358bed62a2f34d30f196e8e74f29634ede24aeecb66f69fd7de0c3fbcc636  ext/sealed/chakra-ui__panda__3925/f2p.json
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/base-3.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/base-3.xml
0fa3555a721fa87ee8baf01f8bcfb1a2d827975a69c6d2fca9e093de38c41496  ext/sealed/chakra-ui__panda__3925/logs/base-3f.log
bb72a026a7f9140ddd399e9a05683f9e3a5c5e24bbf5d794a9363a3bf5666e52  ext/sealed/chakra-ui__panda__3925/logs/base-3f.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-3-1.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-3-1.xml
91c46e6fe58d4ea76703c57d1928912f4267ff93cda23030a783c5538e6e0b1c  ext/sealed/chakra-ui__panda__3925/logs/end-3-2.log
522eca4d6d792dba94a9e3fa0b6e55ee30f51da744eeb379062676fff606912d  ext/sealed/chakra-ui__panda__3925/logs/end-3-2.xml
1b80bc619e2fce29aa54a545dcd956eb39552bea8990b93a210a041baa5e9eb0  ext/sealed/chakra-ui__panda__3925/logs/end-3f-1.log
7ce9aa2ed7729994c6cabc235c21c4c3044674edf7341a2798afe4b5f79f045c  ext/sealed/chakra-ui__panda__3925/logs/end-3f-1.xml
3373e3d23460439328444cce5503e3cdc21b185378f2be8a6966377558dac778  ext/sealed/chakra-ui__panda__3925/logs/end-3f-2.log
24a31fd475d8777d7192b4ec21bfb70053e99df0409b16e86d9e4f7cad531496  ext/sealed/chakra-ui__panda__3925/logs/end-3f-2.xml
5fd3873fb46d375c18f2aaa486b7801b4f6a1c4cf629d1191ef6cc2c00bf1304  ext/sealed/chakra-ui__panda__3925/logs/end.build.log
de7fa1da48bb1cbb7636839ec0d78ff56cd4144aa001846007ab4a99b84b0730  ext/sealed/chakra-ui__panda__3925/logs/end.build.log.iid
b51f1609993547c6eb04895f6045478ca29b48c8f6131333f85dd33201186741  ext/sealed/chakra-ui__panda__3925/logs/endf.build.log
41bc2290c30d9e0b958a3b5f490eb4eb50f474b39995096243cb9530f33256a3  ext/sealed/chakra-ui__panda__3925/logs/endf.build.log.iid
c4465faac16627b5b612192e2d0d95e08aa838c0c68ad5a4ded815a4cdb268c4  ext/sealed/fossasia__eventyay__4509/diag3.reply.md
fd5bfba6f4155290950e8c7cbb27e7a6a2878972ab36f78eca252fd06e479e28  ext/sealed/fossasia__eventyay__4509/diag3.reply.md.run.json
092fce73fedfa47743e704b909e613a1fd2144bbf7bb396dd9c0bc8f4fcaea2f  ext/sealed/swc-project__swc__12010/diag3.reply.md
ccef85e270e7edac7c886a87c695c60931a0897450745580f9f5096d23d774a7  ext/sealed/swc-project__swc__12010/diag3.reply.md.run.json
e225c41c16d5cffed70b50d708ab9c508dd8d2ef3a371c1a0f102c50c1ce7c89  ext/sealed/swc-project__swc__12010/logs/base-6.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/base-6.xml
7a18caba9e0df1b41a4eed4c83c4cebcf8df27974de8373faf0cbbd617482b40  ext/sealed/swc-project__swc__12010/logs/base-6f.log
9775a11af086b7275c81e8c07b0a85da01ccd8750d8d0141399934cb76bb0838  ext/sealed/swc-project__swc__12010/logs/end-6-1.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-6-1.xml
53ab06f07a82216f2d34961464fa416aa9d69f8e35167d05817aaba22e42f3f5  ext/sealed/swc-project__swc__12010/logs/end-6-2.log
50b79c976aa0f8e8e6cae59da9d777ac4213b6c5c28a661f31eee886d16c665d  ext/sealed/swc-project__swc__12010/logs/end-6-2.xml
a1baaaa18b42901619e4fec86163bb3b8381b2fa78b748c171a14b0e291bca31  ext/sealed/swc-project__swc__12010/logs/end.build.log
5a18aabae80656d28b4f83e13bb0d2ccd2c593546b58559c70da18785525d82e  ext/sealed/swc-project__swc__12010/logs/end.build.log.iid
1c1960b48614c3474c528daba645dff51ff589b97833d5d95bbe7a2a9641bd69  ext/sealed/swc-project__swc__12010/logs/endf.build.log
035da8044b1c4cb2df697111126d4b1824b8af0f52041db38f51a99b01371ac6  ext/sealed/swc-project__swc__12010/logs/endf.build.log.iid
```

### Tools and Docker

- `bench/` at `89d9e8a7e521cc8e64a258dd44470d50b34d3bec`; `git status --short bench` empty.
- Docker left: 262 `bench-ext-*` containers and 132 `bench-ext/*` images, all from the gated test runs (`bench-ext-fx*`, `bench-ext-other`, `bench-ext/probe:net`). No candidate's container or image is left.
- `removed.txt`: 250 lines.


### Addendum, 2026-11-03: every out that meets the feedback trigger

The review found that the recheck pass above covered only the two candidates a diagnosis blamed on the recipe. A generic fix must apply to every candidate it covers (the stop rule, ruling 8, content independence), so the same pass was extended with no new fix. The feedback-round sentence in prereg ruling 10 now says the trigger, not a diagnosis, decides which candidates are rechecked.

- Trigger scan: for every out row in all stacks, `needsFeedback` was applied to the last attempt's `base-<a>`, `end-<a>-1` and `end-<a>-2` runs from `meta.json` (counts and exit codes only). Only s3 rank 10, apache/iggy#4018, meets it and has not had its feedback round. swc#12010 meets it but its feedback round already ran. eventyay#4509 ran cases. Every other out had no runs (rebase merge, recipe failed) or ran cases (servo#47685), and datafusion#24211 was out of memory.
- Recheck: `recheck: feedback round` for iggy#4018, then `ext check ... s3 10 --tier 1` through `<data>/ext/recheck.sh`, between equal `pgsnap` snapshots, followed by the walk's removal step.
  - Before the build the disk estimate was 7.95 GB free, under the 15 GB floor. I stopped the first attempt in its build and ran `docker builder prune -f` once, which freed 21 GB (logged in `logs/recheck.out`). The recheck then started again at code 00a3113.
- Verdict: apache/iggy#4018 `out PR tests do not pass at end`. The feedback round passed (probe 29 cases), and the runs again exited 94 with 0 cases.
- Sample delta: none. `progress/step4/sample.tsv` is unchanged (a200de5b…) and the s3 cold-setup repo stays `pola-rs/polars`.
- `sampleOf` now takes the first `perStack` accepted rows by tier, then rank, with at most `perRepo` per repo (commit 00a3113, always-run test). It gives the same sample.
- Run totals now:
  - `check` ran 58 times over 36 candidates.
  - Recipe agent: 52 runs, usage input 899 / output 469967 / cacheRead 12850378 / cacheWrite 2035862.
  - Sealed diagnoses: 11 runs, usage 150 / 30930 / 6307692 / 1783155.
  - `removed.txt`: 262 lines.
  - Docker: 262 containers and 132 images, all fixtures or `probe:net`; nothing of a candidate is left.
  - `bench/` at `00a311399d1e7987e45c061f1980750e59fb86af`, with `git status --short bench` empty.
- Reported to the user on 2026-11-03:
  - The two `out of memory` outs, apache/datafusion#24211 and swc-project/swc#12010, were reported to the user on 2026-11-03.
  - The known limit eventyay#4509 (`cause: recipe` with cases run, which the feedback round does not cover) was reported to the user on 2026-11-03.

Hashes (changed or new since the superseding list, plus the re-saved `pr.json` of every rechecked candidate; paths relative to `<data>` unless under `progress/`; `raw/` still matches `raw.sha256`):

```
9ececf47186150e3cdfcfbf91e2dce925e5442a221d6091f359e4c3b80f0fc9d  progress/step4/walk.tsv
a200de5b1785dcec02c45ebdafe867f030847a10d3e07c54fb684555a83e76d1  progress/step4/sample.tsv
9cf6c0cf5e68e29f96231a2b5ac5c41afddcd3446f6f9d426e91ecb784c96b37  ext/sealed/swc-project__swc__12010/pr.json
e6e7bae09ebe27de1bb34e531e29e5cfab32efce49a69236a845aa1ddc847acd  ext/sealed/chakra-ui__panda__3925/pr.json
94410629314c3d66c7b4fc03de860b169536fdeac9a024a5dbc13b8cd647d6f5  ext/sealed/apache__iggy__4018/pr.json
9ececf47186150e3cdfcfbf91e2dce925e5442a221d6091f359e4c3b80f0fc9d  ext/walk.tsv
5f2e72e695ae2962803a2b883f2e4fef24cf072bc18cbd9b99fc8a511eab64a0  ext/recipes/apache__iggy/recipe.json
b758d14d26a4d66455519e440da78e29e46294f9f63728b00b9ac8530d228459  ext/tasks/apache__iggy__4018/meta.json
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/base-4.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/base-4.xml
551e2f274a5faf4bbddeaeaf7afead02a7178692077abb9140e8349c8dbbee06  ext/sealed/apache__iggy__4018/logs/base-4f.log
eb495adffc03e3ed6091d9c2196325c3d7f9a04923da38dc86c6222a9842db0a  ext/sealed/apache__iggy__4018/logs/base-4f.xml
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/end-4-1.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/end-4-1.xml
ee9f665693726fdffdb59a81da5dac3d2dec8bac43019e9b3ac47a13e5df3150  ext/sealed/apache__iggy__4018/logs/end-4-2.log
1275f33805f4329533b06cce9d1455de267a26d10da56feb1471bf8585dad2e3  ext/sealed/apache__iggy__4018/logs/end-4-2.xml
ab5f5cb4db35a6ca5a9c5300cf013a353111a7f66101c149828d57a8f9ced31f  ext/sealed/apache__iggy__4018/logs/end-4f-1.log
eb495adffc03e3ed6091d9c2196325c3d7f9a04923da38dc86c6222a9842db0a  ext/sealed/apache__iggy__4018/logs/end-4f-1.xml
5beb5e9908a09551c847baddac13c445bd0ec71f22b73a22658b562b7b9ae703  ext/sealed/apache__iggy__4018/logs/end-4f-2.log
eb495adffc03e3ed6091d9c2196325c3d7f9a04923da38dc86c6222a9842db0a  ext/sealed/apache__iggy__4018/logs/end-4f-2.xml
347259b3084c76accb7fa1ee80417be85a846cf247b068d2f335e0d21ab18aaa  ext/sealed/apache__iggy__4018/logs/end.build.log
f62a6a6d600627213971c0dd916111418bfd3b973bd7c14764be1dca140f1ee0  ext/sealed/apache__iggy__4018/logs/end.build.log.iid
7047fc00d700f588c43c655459d399910cb496319b59817d577c568131679b7f  ext/sealed/apache__iggy__4018/logs/endf.build.log
1fbb11f0a946f6d5705f822553b8e98e4a2803497eeac466813878d19d9bd115  ext/sealed/apache__iggy__4018/logs/endf.build.log.iid
```
