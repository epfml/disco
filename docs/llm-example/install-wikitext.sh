mkdir -p ./datasets/wikitext
mkdir -p ./datasets/wikitext-103
curl https://s3.amazonaws.com/research.metamind.io/wikitext/wikitext-103-raw-v1.zip --output ./datasets/wikitext/raw.zip
unzip ./datasets/wikitext/raw.zip -d ./datasets/wikitext-103
mv ./datasets/wikitext-103/wikitext-103-raw/wiki.train.raw ./datasets/wikitext-103/train
mv ./datasets/wikitext-103/wikitext-103-raw/wiki.test.raw ./datasets/wikitext-103/test
mv ./datasets/wikitext-103/wikitext-103-raw/wiki.valid.raw ./datasets/wikitext-103/validation
rmdir ./datasets/wikitext-103/wikitext-103-raw/